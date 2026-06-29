"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { Send, ThumbsUp, X } from "lucide-react"
import { AnimatePresence, m } from "framer-motion"
import toast from "react-hot-toast"
import { AdminChatInputToolbar } from "@/components/chat/AdminChatInputToolbar"
import { compressImage } from "@/lib/image"
import { t } from "@/lib/i18n"

interface AdminChatInputProps {
  onSend: (text: string, images?: File[], documents?: File[]) => Promise<void>
  isSending: boolean
  onTyping?: (isTyping: boolean) => Promise<void>
  sessionStatus: string
}

function base64ToFile(base64Str: string, filename: string): File {
  const arr = base64Str.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * Ô soạn thảo chat admin — pill-style giống ChatInput của UI, contentEditable,
 * emoji, ảnh/tài liệu đính kèm với framer-motion animation.
 */
export function AdminChatInput({
  onSend,
  isSending,
  onTyping,
  sessionStatus,
}: AdminChatInputProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  const [isUploading, setIsUploading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isEmpty, setIsEmpty] = useState(true)
  const [pendingImages, setPendingImages] = useState<{ id: string; data: string }[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [measuredHeight, setMeasuredHeight] = useState(40)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const isDisabled = sessionStatus !== "HUMAN_HANDLING"
  // Phân biệt để quyết định hiện ThumbsUp (thân thiện) vs Send mờ (disabled state)
  const isHumanMode = sessionStatus === "HUMAN_HANDLING"

  const placeholder =
    sessionStatus === "AI_HANDLING"
      ? t("chat.inputDisabledAi")
      : sessionStatus === "CLOSED"
      ? t("chat.inputDisabledClosed")
      : t("chat.inputPlaceholder")

  const getCleanText = (el: HTMLDivElement | null): string => {
    if (!el) return ""
    let text = el.innerText || el.textContent || ""
    text = text.replace(/\u00a0/g, " ")
    return text
  }

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

  const updateHeight = () => {
    if (!editorRef.current || !cloneRef.current) return
    cloneRef.current.innerHTML = editorRef.current.innerHTML
    const scrollHeight = cloneRef.current.scrollHeight
    // Giới hạn trong khoảng 40px (1 dòng) - 120px (khoảng 4-5 dòng)
    const newHeight = Math.min(Math.max(scrollHeight, 40), 120)
    const over = scrollHeight > 120
    setIsOverflowing(over)
    setMeasuredHeight(newHeight)
  }

  useEffect(() => {
    updateHeight()
  }, [])

  // Cuộn xuống cuối khi vừa overflow (dòng 5 trở lên)
  useEffect(() => {
    if (isOverflowing && editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight
    }
  }, [isOverflowing])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    )

    if (files.length === 0) {
      e.preventDefault()
      const text = e.clipboardData.getData("text/plain")
      if (text) document.execCommand("insertText", false, text)
      return
    }

    e.preventDefault()
    if (pendingImages.length + files.length > 5) {
      toast.error(t("chat.inputMaxImages"))
      return
    }

    setIsUploading(true)
    try {
      const newBase64s: string[] = []
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(t("chat.inputFileSizeExceeded"))
          continue
        }
        newBase64s.push(await compressImage(file))
      }
      setPendingImages((prev) => [
        ...prev,
        ...newBase64s.map((data) => ({ id: Math.random().toString(36).slice(2, 9), data })),
      ].slice(0, 5))
    } catch {
      toast.error(t("chat.inputFileSizeExceeded"))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const value = inputValue.trim()
    const hasImages = pendingImages.length > 0
    const hasFiles = pendingFiles.length > 0

    if ((!value && !hasImages && !hasFiles) || isSending || isUploading || isDisabled) return

    if (onTyping && isTypingRef.current) {
      isTypingRef.current = false
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      void onTyping(false)
    }

    // Sao lưu để rollback nếu API lỗi
    const tempValue = inputValue
    const tempImages = [...pendingImages]
    const tempFiles = [...pendingFiles]

    setInputValue("")
    setIsEmpty(true)
    setPendingImages([])
    setPendingFiles([])
    setMeasuredHeight(40)
    setIsOverflowing(false)
    if (editorRef.current) editorRef.current.innerHTML = ""

    setIsUploading(true)
    try {
      let filesToUpload: File[] | undefined
      let documentsToUpload: File[] | undefined

      if (hasImages) {
        filesToUpload = tempImages.map((obj, i) =>
          base64ToFile(obj.data, `chat_image_${Date.now()}_${i}.jpg`),
        )
      }
      if (hasFiles) documentsToUpload = tempFiles

      await onSend(value, filesToUpload, documentsToUpload)
      editorRef.current?.focus()
    } catch {
      toast.error(t("chat.inputSendFailed"))
      // Rollback: khôi phục nội dung khi gửi thất bại
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

  const handleEmojiSelect = (emoji: string) => {
    const el = editorRef.current
    if (!el || isDisabled) return
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
    setIsEmpty(cleanText.trim() === "")
    updateHeight()
  }

  const handleImagesAdded = (base64s: string[]) => {
    setPendingImages((prev) => {
      const combined = [
        ...prev,
        ...base64s.map((data) => ({ id: Math.random().toString(36).slice(2, 9), data })),
      ]
      return combined.slice(0, 5)
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

    if (onTyping && !isDisabled) {
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
    if (isDisabled || isSending || isUploading) return
    await onSend("👍")
  }

  const isTyping = inputValue.length > 0 || pendingImages.length > 0 || pendingFiles.length > 0

  if (sessionStatus === "CLOSED" || sessionStatus === "CLOSED_BY_CLIENT") {
    return (
      <div className="shrink-0 px-4 py-3 flex items-center justify-center">
        <span className="text-sm font-medium italic" style={{ color: "var(--color-error)" }}>
          {sessionStatus === "CLOSED_BY_CLIENT" ? "Client đã đóng phiên chat" : "Đã đóng phiên chat"}
        </span>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="shrink-0 px-4 py-3"
      style={{ borderTop: "1px solid var(--color-border-default)" }}
    >
      {/* Pill container — giống ChatInput của UI */}
      <div
        className="rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 focus-within:border-[var(--color-primary)] transition-[border-color,box-shadow] flex flex-col"
      >
        {/* Preview ảnh và tài liệu tạm — hiện khi có file, ẩn khi không có */}
        {(pendingImages.length > 0 || pendingFiles.length > 0) && (
          <div className="overflow-hidden px-3">
            <div
              className="flex gap-2 flex-wrap pt-3 pb-2 border-b"
              style={{ borderColor: "color-mix(in srgb, var(--color-border-default) 40%, transparent)" }}
            >
              {pendingImages.map((imgObj, i) => (
                <div
                  key={imgObj.id}
                  className="relative group flex-shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgObj.data}
                    alt=""
                    className="h-14 w-auto max-w-[100px] object-contain rounded-lg"
                    style={{ border: "1px solid var(--color-border-default)" }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full bg-zinc-800/80 text-white hover:bg-red-500 transition-all z-20"
                    aria-label={`Xóa ảnh ${i + 1}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {pendingFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative group flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 py-2 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)] shrink-0"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <span
                    className="text-xs font-medium truncate max-w-[120px]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                      setTimeout(() => {
                        if (editorRef.current) focusAndSetCaretToEnd(editorRef.current)
                      }, 50)
                    }}
                    className="absolute -top-1.5 -right-1.5 size-4 flex items-center justify-center rounded-full bg-zinc-800/80 text-white hover:bg-red-500 transition-all z-20"
                    aria-label={`Xóa file ${i + 1}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vùng gõ chữ contentEditable */}
        <div className="relative flex-1 pt-3 pb-2">
          {/* Hidden clone để đo chiều cao thực tế */}
          <div
            aria-hidden="true"
            ref={cloneRef}
            className="absolute left-0 w-full px-4 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words pointer-events-none invisible opacity-0 z-[-1]"
            style={{ fontSize: "var(--font-size-md)" }}
          />
          <div
            ref={editorRef}
            contentEditable={!isDisabled}
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void handleSubmit(e as unknown as FormEvent)
              }
            }}
            onInput={handleInput}
            onPaste={(e) => void handlePaste(e)}
            onScroll={(e) => {
              if (!isOverflowing) {
                (e.target as HTMLDivElement).scrollTop = 0
              }
            }}
            style={{
              height: `${measuredHeight}px`,
              overflowY: isOverflowing ? "hidden" : "clip",
              scrollBehavior: isOverflowing ? "smooth" : "auto",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-md)",
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "text",
            }}
            className="block w-full bg-transparent px-4 font-medium focus:outline-none transition-[height] duration-200 ease-out whitespace-pre-wrap break-words leading-relaxed"
            role="textbox"
            aria-multiline="true"
            aria-label={t("chat.inputPlaceholder")}
          />
          {/* Placeholder hiển thị khi rỗng */}
          {isEmpty && (
            <span
              className="absolute left-4 top-3 text-sm font-medium pointer-events-none select-none"
              style={{ color: "var(--color-text-muted)" }}
            >
              {placeholder}
            </span>
          )}
        </div>

        {/* Bottom bar: Toolbar + Send */}
        <div
          className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-[var(--color-border-default)]/40 bg-[var(--color-surface-2)]/30 rounded-b-[19px]"
        >
          <AdminChatInputToolbar
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            onEmojiSelect={handleEmojiSelect}
            pendingImagesCount={pendingImages.length}
            onImagesAdded={handleImagesAdded}
            pendingFilesCount={pendingFiles.length}
            onFilesAdded={(files) =>
              setPendingFiles((prev) => [...prev, ...files].slice(0, 3))
            }
            disabled={isDisabled}
          />

          {/* Nút gửi tin nhắn: Send khi có nội dung, ThumbsUp khi rỗng ở HUMAN_HANDLING */}
          <div className="shrink-0">
            {isTyping ? (
              <button
                type="submit"
                disabled={isSending || isUploading || isDisabled}
                className="flex size-8 items-center justify-center rounded-full transition-all disabled:opacity-40"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
                aria-label={t("chat.sendMessage")}
              >
                <Send className="size-4" />
              </button>
            ) : isHumanMode ? (
              <button
                type="button"
                onClick={handleSendLike}
                disabled={isSending || isUploading}
                className="flex size-8 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all disabled:opacity-50"
                aria-label="Send like"
              >
                <ThumbsUp className="size-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled
                className="flex size-8 items-center justify-center rounded-full opacity-25"
                style={{ backgroundColor: "var(--color-surface-elevated)", color: "var(--color-text-muted)" }}
                aria-label={t("chat.sendMessage")}
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
