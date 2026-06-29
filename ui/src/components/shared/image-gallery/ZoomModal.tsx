import * as React from "react"
import { createPortal } from "react-dom"
import { m, AnimatePresence } from "framer-motion"
import { Send, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel"

export interface ZoomModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
  layoutIds: string[]
  initialIndex?: number
  type: "pending" | "gallery"
  // Cho ảnh tạm (pending)
  value?: string
  onChange?: (val: string) => void
  onSubmit?: () => void
  // Cho ảnh đã gửi (gallery)
  commentId?: string
  onAddReplyQuick?: (text: string) => void
  onIndexChange?: (index: number) => void
}

/**
 * ZoomModal - Component dùng chung cao cấp cho phép phóng to ảnh (ảnh tạm hoặc ảnh đã gửi)
 * tích hợp thanh bình luận nổi Cinematic (Floating Comment Bar) và Popover nhập thông tin nhanh.
 *
 * TẠI SAO bọc AnimatePresence ở ngoài và kiểm tra điều kiện:
 * - Khi zoomedIdx chuyển về null (người dùng đóng modal), AnimatePresence ở cha sẽ giữ
 *   ZoomModal trong DOM tạm thời để thực thi nốt exit animation của nó.
 * - Khi ZoomModal unmount hoàn toàn, toàn bộ state nội bộ của nó sẽ tự động được reset
 *   sạch sẽ về mặc định cho lần mở tiếp theo mà không cần viết code đồng bộ state phức tạp.
 *
 * @param {ZoomModalProps} props Các thuộc tính của ZoomModal
 */
export function ZoomModal(props: ZoomModalProps) {
  const {
    onClose,
    images,
    layoutIds,
    initialIndex = 0,
    type,
    value = "",
    onChange,
    onSubmit,
    onAddReplyQuick,
    onIndexChange,
  } = props
  // TẠI SAO khởi tạo state trực tiếp từ prop ban đầu:
  // Vì component cha quản lý việc render (unmount khi đóng và mount khi mở),
  // component này được coi là mới tinh mỗi khi mở ra. Do đó, state 'text'
  // sẽ tự động nhận giá trị prop 'value' mới nhất mà không cần effect đồng bộ phức tạp.
  const [text, setText] = React.useState(type === "pending" ? value : "")
  const [showUserForm, setShowUserForm] = React.useState(false)
  const [tempName, setTempName] = React.useState("")
  const [tempEmail, setTempEmail] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(initialIndex)
  const [count, setCount] = React.useState(images.length)
  const [hasSwiped, setHasSwiped] = React.useState(false)

  React.useEffect(() => {
    if (!api) return
    const updateCurrent = () => {
      const newCurrent = api.selectedScrollSnap()
      setCurrent(newCurrent)
      if (newCurrent !== initialIndex) {
        setHasSwiped(true)
      }
      if (onIndexChange) onIndexChange(newCurrent)
    }
    
    updateCurrent()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(api.scrollSnapList().length)
    
    api.on("select", updateCurrent)
    return () => {
      api.off("select", updateCurrent)
    }
  }, [api, onIndexChange, initialIndex])

  // TẠI SAO lắng nghe phím Escape (Esc) ở đây:
  // Tăng tính tương tác Cinematic mượt mà bằng phím tắt đóng nhanh.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleTextChange = (val: string) => {
    setText(val)
    if (type === "pending" && onChange) {
      onChange(val)
    }
  }

  const handleSend = () => {
    if (!text.trim()) return

    if (type === "pending") {
      // Đối với ảnh tạm, nút Send sẽ đóng modal phóng to và tự động trigger submit
      onClose()
      if (onSubmit) onSubmit()
      return
    }

    // Đối với ảnh đã gửi (gallery) -> cần tạo reply nhanh
    const storedName = sessionStorage.getItem("comment_name")
    const storedEmail = sessionStorage.getItem("comment_email")

    if (storedName && storedEmail) {
      // Đã có thông tin khách hàng -> tiến hành gửi reply luôn
      onAddReplyQuick?.(text.trim())
      setText("")
      setIsSubmitting(true)
      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 400)
    } else {
      // Chưa có thông tin khách hàng -> hiển thị Popover yêu cầu điền nhanh
      setShowUserForm(true)
    }
  }

  const handleConfirmUserInfo = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!tempName.trim() || !tempEmail.trim()) {
      setFormError("Vui lòng điền đầy đủ Tên và Email!")
      return
    }

    // Lưu thông tin khách hàng vào LocalStorage để sử dụng cho lần sau
    sessionStorage.setItem("comment_name", tempName.trim())
    sessionStorage.setItem("comment_email", tempEmail.trim())

    // Tiến hành gửi phản hồi nhanh
    onAddReplyQuick?.(text.trim())
    setText("")
    setShowUserForm(false)
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      onClose()
    }, 400)
  }

  // TẠI SAO trả về trực tiếp Portal chứa m.div (không bọc AnimatePresence bên trong nữa):
  // Do AnimatePresence đã ở component cha, Framer Motion sẽ theo dõi phần m.div này và tự động
  // giữ nó lại trong DOM khi component cha huỷ bỏ việc render ZoomModal cho đến khi exit animation hoàn tất.
  return createPortal(
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] backdrop-blur-[5px] bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col items-center justify-center w-full h-full pointer-events-none">
        
        <Carousel
          opts={{ startIndex: initialIndex, loop: false }}
          setApi={setApi}
          className="w-full h-full flex flex-col justify-center pointer-events-auto"
        >
          <CarouselContent className="h-full ml-0">
            {images.map((src, index) => (
              <CarouselItem key={index} className="h-full pl-0 flex items-center justify-center relative">
                <div className="relative inline-flex max-w-[85vw] sm:max-w-[70vw] max-h-[70vh] sm:max-h-[72vh]">
                  {current === index ? (
                    <m.img
                      layoutId={layoutIds[index] || ""}
                      src={src}
                      alt=""
                      className="max-h-[70vh] sm:max-h-[72vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                      transition={{ duration: hasSwiped ? 0 : 0.25, ease: [0.25, 1, 0.5, 1] }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <img
                      src={src}
                      alt=""
                      className="max-h-[70vh] sm:max-h-[72vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {/* Nút đóng lồi ra góc trên phải */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 size-8 sm:size-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white backdrop-blur-md flex items-center justify-center transition-all z-50 border border-white/20 shadow-xl"
                    aria-label="Đóng ảnh"
                  >
                    <X className="size-4 sm:size-5" />
                  </button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Thumbnails Sidebar - Hidden on mobile, visible on sm and up */}
          {images.length > 1 && (
            <div className="hidden sm:flex absolute right-20 top-1/2 -translate-y-1/2 flex-col gap-3 z-50 max-h-[80vh] overflow-y-auto p-1 scrollbar-hide pointer-events-auto">
              {images.map((src, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (api) api.scrollTo(index, true)
                  }}
                  className={cn(
                    "relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                    current === index 
                      ? "border-[var(--color-primary)] scale-110 shadow-lg" 
                      : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                  )}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {images.length > 1 && (
            <>
              <CarouselPrevious className="hidden sm:flex left-2 bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white backdrop-blur-md size-10" />
              <CarouselNext className="hidden sm:flex right-2 bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white backdrop-blur-md size-10" />
              
              <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current ? "bg-white w-5" : "bg-white/40 hover:bg-white/60 w-1.5"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      api?.scrollTo(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </Carousel>

        {/* Floating Comment Bar đè nhẹ lên ảnh phía dưới, giao diện Glassmorphism Cinematic */}
        {type === "pending" && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[480px] pointer-events-auto z-10"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="relative bg-zinc-950/75 dark:bg-zinc-900/90 backdrop-blur-md border border-white/15 dark:border-white/5 shadow-2xl rounded-2xl p-2 flex items-center gap-2">
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                type === "pending"
                  ? "Gõ tiếp bình luận..."
                  : "Phản hồi nhanh cho bình luận này..."
              }
              className="flex-1 bg-transparent px-3 py-1.5 text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none resize-none h-9 max-h-20 font-body border-0 leading-relaxed"
            />

            <Button
              type="button"
              variant="default"
              size="sm"
              isLoading={isSubmitting}
              disabled={!text.trim() || isSubmitting}
              onClick={handleSend}
              className="h-8 px-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white dark:text-black font-semibold flex items-center gap-1 shrink-0 transition-all"
            >
              <Send className="size-3.5" />
              <span>Gửi</span>
            </Button>

            {/* POPVER NHẬP THÔNG TIN KHÁCH HÀNG (Radix-Style hand-crafted bằng Framer Motion) */}
            <AnimatePresence>
              {showUserForm && (
                <m.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 25,
                  }}
                  className="absolute bottom-full left-0 right-0 mb-3 bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl p-4 text-left z-20"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Thông tin phản hồi
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="text-zinc-400 hover:text-white border-0 bg-transparent transition-all"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <form onSubmit={handleConfirmUserInfo} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Họ và Tên *
                      </label>
                      <input
                        type="text"
                        required
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full h-8 px-3 rounded-lg bg-zinc-800 border border-white/5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                        Địa chỉ Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={tempEmail}
                        onChange={(e) => setTempEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full h-8 px-3 rounded-lg bg-zinc-800 border border-white/5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20"
                      />
                    </div>
                    {formError && (
                      <p className="text-[10px] font-semibold text-red-400">
                        {formError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      className="w-full h-8 text-xs font-semibold"
                    >
                      Xác nhận & Gửi phản hồi
                    </Button>
                  </form>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </m.div>,
    document.body
  )
}
