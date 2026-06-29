import * as React from "react"
import dynamic from "next/dynamic"
import { m, AnimatePresence } from "framer-motion"
import { ImagePlus, Smile, X } from "lucide-react"
import type { EmojiClickData, Theme } from "emoji-picker-react"
import toast from "react-hot-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { compressImage } from "@/lib/image"
import { ZoomModal } from "@/components/shared/image-gallery/ZoomModal"

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false })

export interface EmojiInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  label: string
  pendingImages?: string[]
  onImagesChange?: (images: string[]) => void
  submitSlot?: React.ReactNode
  authorName?: string
  onClearTag?: () => void
}

/**
 * EmojiInput - Khung nhập câu hỏi và phản hồi thông minh, kế thừa contentEditable.
 * Tích hợp chèn emoji, tag tác giả inline dạng chip, tải ảnh Base64 nén và paste ảnh trực tiếp từ clipboard.
 *
 * @param {EmojiInputProps} props Các thuộc tính của EmojiInput
 */
export function CommentForm({
  value,
  onChange,
  placeholder,
  label,
  pendingImages,
  onImagesChange,
  submitSlot,
  authorName,
  onClearTag,
}: EmojiInputProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showEmoji, setShowEmoji] = React.useState(false)
  const [zoomedIdx, setZoomedIdx] = React.useState<number | null>(null)
  const [currentIdx, setCurrentIdx] = React.useState<number | null>(null)
  const [isEmpty, setIsEmpty] = React.useState(!value && !authorName)

  const savedRangeRef = React.useRef<Range | null>(null)
  const isInitialSyncedRef = React.useRef(false)

  const timeoutIdsRef = React.useRef<Set<NodeJS.Timeout>>(new Set())

  const safeSetTimeout = React.useCallback((cb: () => void, ms: number) => {
    const id = setTimeout(() => {
      cb()
      timeoutIdsRef.current.delete(id)
    }, ms)
    timeoutIdsRef.current.add(id)
    return id
  }, [])

  React.useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout)
      timeoutIdsRef.current.clear()
    }
  }, [])

  // TẠI SAO viết hàm helper getCleanText:
  // Vì Uncontrolled ContentEditable chứa cả phần tử HTML của chip tag và văn bản tự gõ,
  // hàm này clone lại DOM của div, xóa bỏ các phần tử chip tag, rồi trích xuất nội dung chữ thô sạch,
  // giúp đồng bộ state React 100% tinh khiết, loại bỏ hoàn toàn lỗi dính chữ (fusing text).
  const getCleanText = (el: HTMLDivElement | null): string => {
    if (!el) return ""
    const clone = el.cloneNode(true) as HTMLDivElement
    const chips = clone.querySelectorAll(".mention-chip")
    chips.forEach((chip) => chip.remove())
    let text = clone.innerText || clone.textContent || ""
    text = text.replace(/\u00a0/g, " ") // Chuyển đổi khoảng trắng đặc biệt của contentEditable
    return text
  }

  // TẠI SAO viết hàm focusAndSetCaretToEnd:
  // Đảm bảo đưa con trỏ soạn thảo xuống cuối cùng của div sau khi tự động lấy focus,
  // tránh tình trạng con trỏ nhảy ngược lên đầu hoặc nhảy lung tung trên di động (Caret Jumping).
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

  // TẠI SAO dùng saveSelection:
  // Lưu lại vị trí con trỏ chuột hiện tại của người dùng để hỗ trợ chèn emoji mượt mà
  // tại chính xác tọa độ con trỏ thay vì mặc định dồn hết xuống cuối khối nhập liệu.
  const saveSelection = () => {
    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        if (ref.current?.contains(range.commonAncestorContainer)) {
          savedRangeRef.current = range.cloneRange()
        }
      }
    }
  }

  // TẠI SAO sử dụng React.useEffect đồng bộ một lần khi mount:
  // Khởi tạo giao diện ban đầu của div gõ chữ nếu có sẵn value hoặc tag từ ngoài truyền vào (ví dụ form Edit hoặc form Reply).
  // Tránh việc cập nhật ghi đè innerHTML liên tục gây mất con trỏ chuột trong quá trình gõ.
  React.useEffect(() => {
    const el = ref.current
    if (!el || isInitialSyncedRef.current) return

    if (value || authorName) {
      let html = ""
      if (authorName) {
        html += `<span class="mention-chip inline-flex items-center font-semibold text-[#4dddff] bg-[#0577e8]/15 px-2 py-0.5 rounded-sm text-[14px] mr-1.5 select-all align-middle" contenteditable="false">${authorName}<span class="close-tag ml-1 text-blue-400 hover:text-blue-600 select-none">×</span></span>&nbsp;`
      }
      if (value) {
        html += value
      }
      el.innerHTML = html

      safeSetTimeout(() => {
        setIsEmpty(html === "")
      }, 0)

      focusAndSetCaretToEnd(el)
    }
    isInitialSyncedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // TẠI SAO sử dụng React.useEffect đồng bộ động khi props thay đổi:
  // - Xóa sạch div nếu parent reset value về rỗng (như sau khi submit thành công).
  // - Cập nhật/Thêm chip tag mới nếu authorName thay đổi mà không làm mất văn bản người dùng đang gõ dở.
  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (value === "") {
      const hasChip = el.querySelector(".mention-chip")
      if (!authorName && (el.innerHTML !== "" || hasChip)) {
        el.innerHTML = ""
        safeSetTimeout(() => {
          setIsEmpty(true)
        }, 0)
        return
      }
    }

    const currentChip = el.querySelector(".mention-chip")
    const currentChipText = currentChip
      ? currentChip.textContent?.replace("×", "").trim()
      : ""
    const currentCleanText = getCleanText(el)

    if (value !== currentCleanText && !authorName) {
      const currentChipHtml = currentChip ? currentChip.outerHTML : ""
      el.innerHTML = currentChipHtml + (value || "")
      safeSetTimeout(() => {
        setIsEmpty(!value && !currentChipHtml)
      }, 0)
    } else if (authorName && currentChipText !== authorName) {
      const chipHtml = `<span class="mention-chip inline-flex items-center font-semibold text-[#4dddff] bg-[#0577e8]/15 px-2 py-0.5 rounded-sm text-[14px] mr-1.5 select-all align-middle" contenteditable="false">${authorName}<span class="close-tag ml-1 text-blue-400 hover:text-blue-600 select-none">×</span></span>&nbsp;`
      const currentCleanText = getCleanText(el) || value
      el.innerHTML = chipHtml + (currentCleanText ? currentCleanText : "")

      safeSetTimeout(() => {
        setIsEmpty(false)
      }, 0)

      focusAndSetCaretToEnd(el)
    } else if (!authorName && currentChip) {
      currentChip.remove()
      const currentCleanText = getCleanText(el)

      safeSetTimeout(() => {
        setIsEmpty(currentCleanText === "")
      }, 0)
    }
     
  }, [authorName, value])

  // TẠI SAO bắt sự kiện onKeyDown cho phím Backspace:
  // Khi người dùng xóa hết văn bản tự gõ và chỉ còn chip tag, nhấn Backspace tiếp theo sẽ xóa
  // sạch chip tag và thông báo cho component cha reset trạng thái tag thông qua onClearTag().
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Backspace") {
      const el = ref.current
      if (!el) return
      const cleanText = getCleanText(el)
      const chip = el.querySelector(".mention-chip")
      if (cleanText.trim() === "" && chip) {
        e.preventDefault()
        chip.remove()
        el.innerHTML = ""
        setIsEmpty(true)
        onChange("")
        onClearTag?.()
        el.focus()
      }
    }
  }

  // TẠI SAO dùng Event Delegation trong handleDivClick:
  // Lắng nghe sự kiện click trên nút "x" nhỏ lồng trong chip tag (là một phần tử HTML động),
  // giúp xóa chip tag ngay lập tức khi click, giữ lại text tự gõ, và gọi onClearTag().
  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.classList.contains("close-tag")) {
      e.preventDefault()
      e.stopPropagation()
      const el = ref.current
      if (!el) return
      const chip = el.querySelector(".mention-chip")
      if (chip) {
        chip.remove()
        const cleanText = getCleanText(el)
        onChange(cleanText)
        setIsEmpty(cleanText === "")
        onClearTag?.()
        focusAndSetCaretToEnd(el)
      }
    }
  }

  // TẠI SAO chèn Emoji bằng Selection & Range API:
  // Chèn emoji chính xác tại vị trí con trỏ đã lưu trong savedRangeRef giúp trải nghiệm gõ phím cực kỳ
  // tự nhiên và cao cấp, thay vì ép buộc chèn ở cuối dòng giống như cách dùng textarea cũ.
  const handleEmojiClick = (data: EmojiClickData) => {
    const el = ref.current
    if (!el) return

    el.focus()
    let range = savedRangeRef.current

    if (typeof window !== "undefined" && window.getSelection) {
      const sel = window.getSelection()
      if (!range || !el.contains(range.commonAncestorContainer)) {
        range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(false)
      }

      range.deleteContents()
      const emojiNode = document.createTextNode(data.emoji)
      range.insertNode(emojiNode)

      range.setStartAfter(emojiNode)
      range.setEndAfter(emojiNode)
      sel?.removeAllRanges()
      sel?.addRange(range)

      savedRangeRef.current = range.cloneRange()
    }

    const cleanText = getCleanText(el)
    onChange(cleanText)
    setIsEmpty(false)
    setShowEmoji(false)
  }

  const handleInput = () => {
    const el = ref.current
    if (!el) return
    const cleanText = getCleanText(el)
    const hasChip = el.querySelector(".mention-chip")
    setIsEmpty(cleanText === "" && !hasChip)
    onChange(cleanText)
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImagesChange) return
    if ((pendingImages?.length ?? 0) >= 5) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15MB")
      return
    }

    try {
      const compressedBase64 = await compressImage(file)
      onImagesChange([...(pendingImages ?? []), compressedBase64])
      safeSetTimeout(() => {
        if (ref.current) focusAndSetCaretToEnd(ref.current)
      }, 50)
    } catch (error) {
      console.error("Lỗi khi xử lý nén ảnh:", error)
    } finally {
      e.target.value = ""
    }
  }

  // TẠI SAO xử lý paste ảnh trực tiếp: Cho phép user Ctrl+V ảnh vào comment box
  // với UI/animation giống hệt flow click icon, không cần phải mở file picker.
  const handlePaste = React.useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(e.clipboardData.files).filter((f) =>
        f.type.startsWith("image/")
      )
      if (files.length === 0) return
      e.preventDefault()
      if (!onImagesChange) return
      const file = files[0]
      if ((pendingImages ?? []).length >= 5) {
        toast.error("Maximum 5 images per comment")
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error("Image must be under 15MB")
        return
      }
      try {
        const compressed = await compressImage(file)
        onImagesChange([...(pendingImages ?? []), compressed])
      } catch (error) {
        console.error("Lỗi khi paste ảnh:", error)
      }
    },
    [pendingImages, onImagesChange]
  )

  return (
    <div className="rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 focus-within:border-[var(--color-primary)] transition-all">
      <AnimatePresence initial={false}>
        {pendingImages && pendingImages.length > 0 && (
          <m.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden px-3"
          >
            <div className="flex gap-2 flex-wrap pt-3 pb-2 border-b border-[var(--color-border)]">
              {pendingImages.slice(0, 2).map((img, i) => {
                const isOverlay = i === 1 && pendingImages.length > 2;
                const extraCount = pendingImages.length - 2;

                return (
                  <div key={i} className="relative group">
                    {zoomedIdx === null || currentIdx === i ? (
                      <m.img
                        layout
                        layoutId={`pending-img-${i}`}
                        src={img}
                        alt=""
                        onClick={() => {
                          setZoomedIdx(i)
                          setCurrentIdx(i)
                        }}
                        className="h-16 md:h-20 w-full min-w-[100px] max-w-[120px] md:max-w-[160px] object-cover rounded-xl border border-[var(--color-border)] cursor-pointer"
                        style={{ willChange: "transform" }}
                        transition={{
                          duration: 0.25,
                          ease: [0.25, 1, 0.5, 1],
                        }}
                      />
                    ) : (
                      <img
                        src={img}
                        alt=""
                        onClick={() => {
                          setZoomedIdx(i)
                          setCurrentIdx(i)
                        }}
                        className="h-16 md:h-20 w-full min-w-[100px] max-w-[120px] md:max-w-[160px] object-cover rounded-xl border border-[var(--color-border)] cursor-pointer"
                      />
                    )}
                    {isOverlay && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-black/60 pointer-events-none">
                        <span className="text-white text-xl font-bold font-heading">+{extraCount}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = pendingImages.filter((_, j) => j !== i)
                        onImagesChange?.(updated)
                        safeSetTimeout(() => {
                          if (ref.current) focusAndSetCaretToEnd(ref.current)
                        }, 50)
                      }}
                      className="absolute top-1.5 right-1.5 size-5 flex items-center justify-center rounded-full bg-zinc-800/60 dark:bg-black/40 text-white hover:bg-zinc-700/80 transition-all z-20 backdrop-blur-xs border border-white/10"
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <div className="relative flex-1">
        <div
          ref={ref}
          data-ai-field="text"
          contentEditable={true}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={(e) => {
            handleDivClick(e)
            saveSelection()
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          aria-label={label}
          className="block w-full bg-transparent px-4 pt-3 pb-2 text-sm font-medium text-[var(--color-text-primary)] focus:outline-none transition-all resize-none font-body border-0 min-h-[72px] max-h-[150px] overflow-y-auto whitespace-pre-wrap break-words leading-relaxed"
        />
        {isEmpty && (
          <span className="absolute left-4 top-3 text-sm font-medium text-[var(--color-text-muted)] pointer-events-none select-none">
            {placeholder}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-0.5">
          {onImagesChange && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageSelect}
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all border-0 bg-transparent "
                aria-label="Attach image"
              >
                <ImagePlus className="size-4" />
              </button>
            </>
          )}
          <Popover open={showEmoji} onOpenChange={setShowEmoji}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] transition-all border-0 bg-transparent "
                aria-label="Insert emoji"
              >
                <Smile className="size-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-auto p-0 border-0 shadow-xl overflow-hidden"
            >
              <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={"auto" as Theme}
                  height={320}
                  width={280}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {submitSlot}
      </div>

      <AnimatePresence>
        {zoomedIdx !== null && (
          <ZoomModal
            isOpen={true}
            onClose={() => {
              setZoomedIdx(null)
              setCurrentIdx(null)
            }}
            onIndexChange={setCurrentIdx}
            images={pendingImages || []}
            initialIndex={zoomedIdx ?? 0}
            layoutIds={(pendingImages || []).map((_, idx) => `pending-img-${Math.min(idx, 1)}`)}
            type="pending"
            value={value}
            onChange={onChange}
            onSubmit={() => {
              const form = ref.current?.closest("form")
              if (form) {
                form.requestSubmit()
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
