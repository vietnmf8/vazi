import * as React from "react"
import { m, AnimatePresence } from "framer-motion"
import { ZoomModal } from "./ZoomModal"
import { cn } from "@/lib/utils"

interface ImageGalleryProps {
  images: string[]
  commentId?: string
  isUser?: boolean
  onAddReplyQuick?: (text: string) => void
}

/**
 * ImageGallery - Hiển thị bộ sưu tập ảnh đính kèm trong mỗi bình luận/chat.
 * Hỗ trợ nhấp mở ZoomModal phóng to Cinematic và chèn phản hồi nhanh.
 */
export function ImageGallery({ images, commentId, isUser, onAddReplyQuick }: ImageGalleryProps) {
  const [fullscreenIdx, setFullscreenIdx] = React.useState<number | null>(null)
  const [currentIdx, setCurrentIdx] = React.useState<number | null>(null)

  if (images.length === 0) return null

  return (
    <div className={cn("mt-3 space-y-2 flex flex-col", isUser ? "items-end" : "items-start")}>
      {images.length === 1 ? (
        <button
          type="button"
          onClick={() => {
            setFullscreenIdx(0)
            setCurrentIdx(0)
          }}
          className="block max-w-[240px] sm:max-w-[320px] overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] group border-0 bg-transparent p-0"
        >
          <m.img
            layoutId={`gallery-img-0-${images[0].slice(-20)}`}
            src={images[0]}
            alt=""
            loading="lazy"
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="w-full max-h-80 sm:max-h-96 object-contain rounded-xl"
            style={{ willChange: "transform" }}
          />
        </button>
      ) : (
        <div className={cn("flex flex-wrap gap-2", isUser ? "justify-end" : "justify-start")}>
          {images.slice(0, 2).map((img, i) => {
            const isOverlay = i === 1 && images.length > 2;
            const extraCount = images.length - 2;

            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setFullscreenIdx(i)
                  setCurrentIdx(i)
                }}
                className="relative flex-1 min-w-[100px] max-w-[160px] sm:max-w-[200px] overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] group border-0 bg-transparent p-0"
              >
                {fullscreenIdx === null || currentIdx === i ? (
                  <m.img
                    layoutId={`gallery-img-${i}-${img.slice(-20)}`}
                    src={img}
                    alt=""
                    loading="lazy"
                    whileHover={{ scale: 1.04 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                    className="w-full h-28 sm:h-32 object-cover rounded-xl"
                    style={{ willChange: "transform" }}
                  />
                ) : (
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className="w-full h-28 sm:h-32 object-cover rounded-xl"
                  />
                )}
                {isOverlay && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-black/60 pointer-events-none">
                    <span className="text-white text-2xl font-bold font-heading">+{extraCount}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {fullscreenIdx !== null && (
          <ZoomModal
            isOpen={true}
            onClose={() => {
              setFullscreenIdx(null)
              setCurrentIdx(null)
            }}
            onIndexChange={setCurrentIdx}
            images={images}
            initialIndex={fullscreenIdx ?? 0}
            layoutIds={images.map(
              (img, idx) => {
                if (images.length === 1) return `gallery-img-0-${img.slice(-20)}`;
                const mappedIdx = Math.min(idx, 1);
                return `gallery-img-${mappedIdx}-${images[mappedIdx].slice(-20)}`;
              }
            )}
            type="gallery"
            commentId={commentId}
            onAddReplyQuick={onAddReplyQuick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
