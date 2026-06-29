 
"use client"

import { useRef, useState, useEffect, type FormEvent } from "react"
import Image from "next/image"
import { Send, ThumbsUp, X, User } from "lucide-react"
import { m, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { compressImage } from "@/lib/image"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { ChatMessage, ChatWidgetPhase } from "@/types/api"
import { ChatInputToolbar } from "@/components/features/chat/ChatInputToolbar"
import { useTranslations } from "next-intl"

const SparkleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="m21.137 11.519-2.726-.779a7.453 7.453 0 0 1 -5.151-5.151l-.779-2.726a.52.52 0 0 0 -.962 0l-.779 2.726a7.453 7.453 0 0 1 -5.151 5.151l-2.726.779a.5.5 0 0 0 0 .962l2.726.779a7.453 7.453 0 0 1 5.151 5.151l.779 2.726a.5.5 0 0 0 .962 0l.779-2.726a7.453 7.453 0 0 1 5.151-5.151l2.726-.779a.5.5 0 0 0 0-.962z"/>
  </svg>
)

interface ChatInputProps {
  phase: ChatWidgetPhase
  isSending: boolean
  replyingTo?: ChatMessage | null
  onSend: (text: string, files?: File[], documents?: File[]) => Promise<void>
  onRequestHandoff: () => Promise<void>
  onHandback?: () => Promise<void>
  onCancelReply?: () => void
  /** Callback nhận File object duy nhất để upload document */
  onFileUpload?: (file: File) => Promise<void>
  autoFocus?: boolean
  onTyping?: (isTyping: boolean) => Promise<void>
}

/**
 * Ô soạn thảo tin nhắn chính - Đóng vai trò Orchestrator lắp ráp trình soạn thảo và thanh Toolbar đính kèm.
 * TẠI SAO: Đã được refactor phân rã thanh toolbar đính kèm và chọn emoji ra component riêng, giúp file ChatInput giảm từ 601 dòng xuống còn ~350 dòng, cực kỳ dễ bảo trì.
 */
export function ChatInput({
  phase,
  isSending,
  replyingTo,
  onSend,
  onRequestHandoff,
  onHandback,
  onCancelReply,
  onFileUpload,
  onTyping,
}: ChatInputProps) {
  const t = useTranslations("Chat")
  const editorRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)
  const [isUploading, setIsUploading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isEmpty, setIsEmpty] = useState(true)
  const [pendingImages, setPendingImages] = useState<{ id: string; data: string }[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [measuredHeight, setMeasuredHeight] = useState(24)
  const [isOverflowing, setIsOverflowing] = useState(false)

  // Khi vừa chuyển sang trạng thái overflow (từ dòng 4 sang 5), cuộn mượt xuống dưới
  useEffect(() => {
    if (isOverflowing && editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight
    }
  }, [isOverflowing])

  // Đo chiều cao thực tế bằng hidden clone div
  const updateHeight = () => {
    if (!editorRef.current || !cloneRef.current) return
    cloneRef.current.innerHTML = editorRef.current.innerHTML
    const scrollHeight = cloneRef.current.scrollHeight
    // Giới hạn trong khoảng 24px - 91px (vừa khít 4 dòng)
    const newHeight = Math.min(Math.max(scrollHeight, 24), 91)
    
    const over = scrollHeight > 92;
    setIsOverflowing(over)
    setMeasuredHeight(newHeight)
  }

  // Khởi tạo đo lần đầu
  useEffect(() => {
    updateHeight()
  }, [])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const canSend = phase === "CHATTING" || phase === "HANDOFF_PENDING" || phase === "HUMAN_MODE"
  const isHumanMode = phase === "HUMAN_MODE" || phase === "HANDOFF_PENDING"

  // TẠI SAO dùng getCleanText:
  // Giúp trích xuất nội dung văn bản thô thuần khiết từ contentEditable,
  // tự động loại bỏ các khoảng trắng không ngắt của trình duyệt (&nbsp; / \u00a0) để state luôn sạch.
  const getCleanText = (el: HTMLDivElement | null): string => {
    if (!el) return ""
    let text = el.innerText || el.textContent || ""
    text = text.replace(/\u00a0/g, " ")
    return text
  }

  // TẠI SAO dùng focusAndSetCaretToEnd:
  // Đảm bảo đưa con trỏ soạn thảo xuống vị trí cuối cùng của div sau khi tự động lấy focus,
  // tránh tình trạng con trỏ nhảy ngược lên đầu hoặc nhảy lung tung trên di động.
  const focusAndSetCaretToEnd = (el: HTMLDivElement) => {
    el.focus()
    if (typeof window !== "undefined" && window.getSelection) {
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  // TẠI SAO dùng base64ToFile:
  // Giúp convert ngược lại chuỗi Base64 đã nén thành File object tương thích hoàn toàn
  // với callback onFileUpload, giúp tái sử dụng pipeline upload & send của hook useChat.ts.
  const base64ToFile = (base64Str: string, filename: string): File => {
    const arr = base64Str.split(",")
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  // TẠI SAO xử lý paste ảnh trực tiếp: Cho phép user Ctrl+V ảnh vào box chat
  // với UI/animation trượt mượt mà tương tự như ở CommentSection.tsx.
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    )
    
    if (files.length === 0) {
      // Ép buộc chỉ dán văn bản thuần túy (plain text), loại bỏ mọi định dạng HTML (màu nền, in đậm, v.v.)
      e.preventDefault()
      const text = e.clipboardData.getData("text/plain")
      if (text) {
        document.execCommand("insertText", false, text)
      }
      return
    }

    e.preventDefault()

    if (pendingImages.length + files.length > 5) {
      toast.error(t("input_max_images"))
      return
    }

    setIsUploading(true)
    try {
      const newBase64s: string[] = []
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(t("input_size_exceeded", { fileName: file.name }))
          continue
        }
        const compressed = await compressImage(file)
        newBase64s.push(compressed)
      }
      
      setPendingImages((prev) => {
        const combined = [...prev, ...newBase64s.map((data) => ({ id: Math.random().toString(36).slice(2, 9), data }))]
        if (combined.length > 5) {
          toast.error(t("max_5_images", { defaultValue: "Chỉ được gửi tối đa 5 ảnh" }))
          return combined.slice(0, 5)
        }
        return combined
      })
    } catch (error) {
      console.error("Lỗi khi paste ảnh từ clipboard:", error)
      toast.error(t("input_paste_failed"))
    } finally {
      setIsUploading(false)
    }
  }

  // TẠI SAO dùng Optimistic Clear & Rollback trong handleSubmit:
  // Để loại bỏ hoàn toàn độ trễ thị giác khi nhấn Gửi, ta không đợi kết quả API hoàn thành mới xóa input.
  // Thay vào đó, ta sao lưu giá trị hiện tại, lập tức làm trống ô nhập và danh sách ảnh tạm.
  // Nếu cuộc gọi API gửi văn bản hoặc ảnh gặp sự cố, ta khôi phục lại (Rollback) các giá trị cũ vào state để bảo vệ tin nhắn và ảnh của người dùng không bị mất mát.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = inputValue.trim()
    const hasImages = pendingImages.length > 0
    const hasFiles = pendingFiles.length > 0

    // TẠI SAO bỏ check `isSending` khỏi điều kiện chặn (2026-06-24): trước đây nếu user gửi tin
    // tiếp ngay khi `isSending` (state) còn true dù lượt trước đã hiển thị xong UI action (vd
    // Combobox đổi giá trị) — vì state này chỉ reset SAU KHI cả SSE stream + EXIT_REVEAL_DELAY_MS
    // hoàn tất, trễ hơn nhiều so với lúc UI action đã xong — tin nhắn bị DROP ÂM THẦM ngay tại đây,
    // KHÔNG BAO GIỜ tới được sendMessage()/hàng đợi đã thêm trong useChat.ts. Bỏ check ở đây, để
    // useChat.ts là nguồn sự thật DUY NHẤT quyết định gửi ngay hay xếp hàng — vẫn giữ `isUploading`
    // vì đó là race khác (tránh submit mới khi đang upload file của chính lượt trước).
    if ((!value && !hasImages && !hasFiles) || !canSend || isUploading) return

    if (onTyping && isTypingRef.current) {
      isTypingRef.current = false
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      void onTyping(false)
    }

    // Sao lưu giá trị hiện tại để phục vụ rollback nếu API gặp lỗi
    const tempValue = inputValue
    const tempImages = [...pendingImages]
    const tempFiles = [...pendingFiles]

    // Optimistic Clear: Làm sạch tức thì ô soạn thảo và danh sách ảnh tạm
    setInputValue("")
    setIsEmpty(true)
    setPendingImages([])
    setPendingFiles([])
    setMeasuredHeight(24)
    setIsOverflowing(false)
    if (editorRef.current) {
      editorRef.current.innerHTML = ""
    }

    setIsUploading(true)
    try {
      // Gửi gộp cả ảnh và chữ thành một tin nhắn duy nhất
      let filesToUpload: File[] | undefined;
      let documentsToUpload: File[] | undefined;

      if (hasImages) {
        filesToUpload = tempImages.map((obj, i) => base64ToFile(obj.data, `chat_image_${Date.now()}_${i}.png`))
      }
      
      if (hasFiles) {
        documentsToUpload = tempFiles;
      }
      
      if (value || hasImages || hasFiles) {
        await onSend(value, filesToUpload, documentsToUpload)
      }

      if (editorRef.current) {
        editorRef.current.focus()
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn hoặc upload ảnh:", error)
      toast.error(t("input_send_failed"))
      
      // Rollback: Khôi phục lại nội dung soạn thảo ban đầu nếu xảy ra lỗi
      setInputValue(tempValue)
      setIsEmpty(tempValue.trim() === "")
      setPendingImages(tempImages)
      setPendingFiles(tempFiles)
      if (editorRef.current) {
        editorRef.current.innerHTML = tempValue
        focusAndSetCaretToEnd(editorRef.current)
      }
      setTimeout(updateHeight, 0)
    } finally {
      setIsUploading(false)
    }
  }

  // Nhận emoji từ thanh Toolbar đính kèm
  const handleEmojiSelect = (emoji: string) => {
    const el = editorRef.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const emojiNode = document.createTextNode(emoji)
      range.insertNode(emojiNode)
      range.setStartAfter(emojiNode)
      range.setEndAfter(emojiNode)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      el.innerText += emoji
    }
    const cleanText = getCleanText(el)
    setInputValue(cleanText)
    setIsEmpty(false)
    updateHeight()
  }

  // Thêm danh sách ảnh base64 đã nén từ thanh Toolbar
  const handleImagesAdded = (base64s: string[]) => {
    setPendingImages((prev) => {
      const combined = [...prev, ...base64s.map((data) => ({ id: Math.random().toString(36).slice(2, 9), data }))]
      if (combined.length > 5) {
        toast.error(t("max_5_images", { defaultValue: "Chỉ được gửi tối đa 5 ảnh" }))
        return combined.slice(0, 5)
      }
      return combined
    })
    setTimeout(() => {
      if (editorRef.current) focusAndSetCaretToEnd(editorRef.current)
    }, 50)
  }

  const handleInput = () => {
    const el = editorRef.current
    if (!el) return
    const cleanText = getCleanText(el)
    setIsEmpty(cleanText.trim() === "")
    setInputValue(cleanText)
    updateHeight()

    if (onTyping && canSend) {
      if (!isTypingRef.current && cleanText.trim().length > 0) {
        isTypingRef.current = true
        void onTyping(true)
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false
        void onTyping(false)
      }, 2000)
    }
  }

  const handleSendLike = async () => {
    // Bỏ check `isSending` — cùng lý do đã ghi ở handleSubmit, để useChat.ts xếp hàng thay vì
    // component này tự drop âm thầm.
    if (!canSend || isUploading) return
    await onSend("👍")
  }

  if (!canSend) return null

  const isTyping = inputValue.length > 0 || pendingImages.length > 0 || pendingFiles.length > 0

  return (
    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-base)] dark:dark:bg-[#18181b] relative">
      {/* Reply preview bar */}
      <AnimatePresence initial={false}>
        {replyingTo && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden bg-[var(--color-surface-elevated)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-default)] px-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--color-text-primary)]">
                  {t("input_replying")} {replyingTo.sender === "USER" ? t("input_yourself") : t("input_assistant")}
                </p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {replyingTo.message.slice(0, 60)}{replyingTo.message.length > 60 ? "…" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelReply}
                className="shrink-0 rounded p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all"
                aria-label={t("input_cancel_reply")}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <form onSubmit={(e) => void handleSubmit(e)} className="p-3">
        <div className="rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 focus-within:border-[var(--color-primary)] transition-[border-color,box-shadow] flex flex-col">
          
          {/* Preview ảnh và tài liệu tạm */}
          <AnimatePresence initial={false}>
            {(pendingImages.length > 0 || pendingFiles.length > 0) && (
              <m.div
                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                animate={{ height: "auto", opacity: 1, scale: 1 }}
                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden px-3"
              >
                <div className="flex gap-2 flex-wrap pt-3 pb-2 border-b border-[var(--color-border)]/40">
                  <AnimatePresence initial={false}>
                    {pendingImages.map((imgObj, i) => (
                      <m.div
                        key={imgObj.id}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        layout
                        className="relative group"
                      >
                        <Image
                          src={imgObj.data}
                          alt=""
                          width={100}
                          height={56}
                          unoptimized
                          className="h-14 w-auto max-w-[100px] object-contain rounded-lg border border-[var(--color-border)] "
                          style={{ willChange: "transform" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPendingImages((prev) => prev.filter((_, j) => j !== i))
                            setTimeout(() => {
                              if (editorRef.current) focusAndSetCaretToEnd(editorRef.current)
                            }, 50)
                          }}
                          className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full bg-zinc-800/60 dark:bg-black/40 text-white hover:bg-zinc-700/80 transition-all z-20 backdrop-blur-xs border border-white/10 "
                          aria-label={`Remove image ${i + 1}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </m.div>
                    ))}
                    {pendingFiles.map((file, i) => (
                      <m.div
                        key={file.name + i}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        layout
                        className="relative group flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)] shrink-0"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                        <span className="text-xs font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                            setTimeout(() => {
                              if (editorRef.current) focusAndSetCaretToEnd(editorRef.current)
                            }, 50)
                          }}
                          className="absolute -top-1.5 -right-1.5 size-4 flex items-center justify-center rounded-full bg-zinc-800/60 dark:bg-black/40 text-white hover:bg-zinc-700/80 transition-all z-20 backdrop-blur-xs border border-white/10 shadow-sm"
                          aria-label={`Remove file ${i + 1}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* Vùng gõ chữ contentEditable */}
          <div className="relative flex-1 pt-3 pb-2">
            <div
              aria-hidden="true"
              ref={cloneRef}
              className="absolute left-0 w-full px-4 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words pointer-events-none invisible opacity-0 z-[-1]"
            />
            <div
              id="chat-message-input"
              data-ai-field="text"
              ref={editorRef}
              contentEditable={true}
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit(e as unknown as FormEvent)
                }
              }}
              onInput={handleInput}
              onPaste={handlePaste}
              onScroll={(e) => {
                if (!isOverflowing) {
                  (e.target as HTMLDivElement).scrollTop = 0
                }
              }}
              onWheel={(e) => {
                if (isOverflowing) {
                  const el = e.currentTarget;
                  el.scrollTop += e.deltaY;
                }
              }}
              style={{ 
                height: `${measuredHeight}px`,
                overflowY: isOverflowing ? 'hidden' : 'clip',
                scrollBehavior: isOverflowing ? 'smooth' : 'auto'
              }}
              className="block w-full bg-transparent px-4 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none transition-[height] duration-200 ease-out resize-none min-h-[24px] max-h-[91px] whitespace-pre-wrap break-words leading-relaxed"
              role="textbox"
              aria-multiline="true"
              aria-label={t("input_placeholder")}
            />
            {isEmpty && (
              <span className="absolute left-4 top-3 text-sm font-medium text-[var(--color-text-muted)] pointer-events-none select-none">
                {phase === "HANDOFF_PENDING" ? t("input_waiting") : t("input_placeholder")}
              </span>
            )}
          </div>

          {/* Interactive Bar phía dưới */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-[var(--color-border)]/40 bg-[var(--color-surface-2)]/30 rounded-b-[19px]">
            
            {/* Cụm Toolbar đính kèm được phân rã */}
            <ChatInputToolbar
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              onEmojiSelect={handleEmojiSelect}
              pendingImagesCount={pendingImages.length}
              onImagesAdded={handleImagesAdded}
              pendingFilesCount={pendingFiles.length}
              onFilesAdded={(files) => {
                setPendingFiles((prev) => [...prev, ...files])
                setTimeout(() => {
                  if (editorRef.current) focusAndSetCaretToEnd(editorRef.current)
                }, 50)
              }}
            />

            {/* Cụm Toggle AI/Human + Nút Send bên phải */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (isHumanMode) {
                    if (onHandback) await onHandback()
                  } else {
                    await onRequestHandoff()
                  }
                }}
                className={cn(
                  "relative h-7 w-13 rounded-full transition-all duration-300 flex items-center p-0.5 shrink-0 select-none",
                  isHumanMode ? "bg-teal-600/90 hover:bg-teal-600 transition-all" : "bg-amber-600/90 hover:bg-amber-600 transition-all"
                )}
                aria-label={t("input_toggle_mode")}
              >
                <m.div
                  initial={false}
                  className="size-6 rounded-full bg-white flex items-center justify-center shadow-xs"
                  animate={{ x: isHumanMode ? 22 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {isHumanMode ? (
                    <User className="size-3.5 text-teal-600 fill-teal-600/10" />
                  ) : (
                    <SparkleIcon className="size-3.5 text-(--color-primary)" />
                  )}
                </m.div>
              </button>

              {/* Nút Send / Like */}
              <div className="relative size-8 shrink-0">
                <AnimatePresence mode="wait">
                  {isTyping ? (
                    <m.div
                      key="send-btn"
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        type="submit"
                        size="icon"
                        className="size-full rounded-lg"
                        disabled={isSending || isUploading}
                        aria-label={t("input_send_msg")}
                        isLoading={isSending || isUploading}
                      >
                        {!isSending && !isUploading ? <Send className="size-3.5" aria-hidden /> : null}
                      </Button>
                    </m.div>
                  ) : (
                    <m.div
                      key="like-btn"
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <button
                        type="button"
                        onClick={handleSendLike}
                        disabled={isSending || isUploading}
                        className="flex size-full items-center justify-center rounded-lg text-blue-500 hover:bg-[var(--color-surface-2)] transition-all disabled:opacity-50 "
                        aria-label={t("input_send_thumbs")}
                      >
                        <ThumbsUp className="size-5 fill-current" />
                      </button>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>

        <p id="chat-input-hint" className="mt-1.5 pl-2 text-[10px] text-[var(--color-text-muted)] select-none">
          {t("input_hint")}
        </p>
      </form>
    </div>
  )
}
