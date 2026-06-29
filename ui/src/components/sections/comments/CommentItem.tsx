import * as React from "react"
import { useTranslations } from "next-intl"
import { m, AnimatePresence } from "framer-motion"
import { Clock, MoreHorizontal, Pencil, Reply, ThumbsUp, Trash2 } from "lucide-react"
import type { Comment } from "./types"
import { getCountryCode, COMBOBOX_OPTIONS } from "./constants"
import { triggerConfettiBurst } from "./helpers"
import { ImageGallery } from "@/components/shared/image-gallery/ImageGallery"
import { CommentForm } from "./CommentForm"
import { Button } from "@/components/ui/Button"
import { Combobox } from "@/components/ui/Combobox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface MoreMenuProps {
  onEdit: () => void
  onDelete: () => void
}

/**
 * MoreMenu - Popover menu thay thế các nút Edit/Delete trần bằng icon góc phải tinh tế.
 * TẠI SAO dùng Popover: Radix-based popover đem lại trải nghiệm di động và desktop mượt mà,
 * giữ giao diện bình luận tối giản, chỉ xuất hiện các tùy chọn khi người dùng chủ động nhấn.
 */
function MoreMenu({ onEdit, onDelete }: MoreMenuProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-all border-0 bg-transparent shrink-0"
          aria-label="More options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-40 p-1.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-xl z-[100]"
      >
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] rounded-lg transition-all border-0 bg-transparent text-left font-heading"
          >
            <span>Chỉnh sửa</span>
            <Pencil className="size-3.5 text-[var(--color-text-secondary)]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-[var(--color-text-error)] hover:bg-[var(--color-text-error)]/10 rounded-lg transition-all border-0 bg-transparent text-left font-heading"
          >
            <span>Xoá bình luận</span>
            <Trash2 className="size-3.5 text-[var(--color-text-error)]" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}


function getStoredNationality(): string {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("comment_nationality") || "Vietnam"
  }
  return "Vietnam"
}

function hasStoredNationality(): boolean {
  if (typeof window !== "undefined") {
    return !!sessionStorage.getItem("comment_nationality")
  }
  return false
}

export interface CommentNodeProps {
  comment: Comment
  depth: number
  sessionOwnerId: string | null
  editingId: string | null
  editText: string
  editPendingImages: string[]
  setEditPendingImages: (imgs: string[]) => void
  setEditingId: (id: string | null) => void
  setEditText: (txt: string) => void
  onSaveEdit: (id: string) => void
  onStartEdit: (id: string, content: string, images?: string[]) => void
  onDeleteClick: (id: string) => void
  onHelpfulClick: (
    id: string,
    currentlyVoted: boolean,
    e: React.MouseEvent<HTMLButtonElement>
  ) => void
  onStartReply: (id: string, authorName: string) => void
  replyingToId: string | null
  replyText: string
  setReplyText: (txt: string) => void
  replyPendingImages: string[]
  setReplyPendingImages: (imgs: string[]) => void
  onCancelReply: () => void
  onReplySubmit: (parentId: string, replyNationality: string) => void
  fullname: string
  setFullname: (name: string) => void
  email: string
  setEmail: (email: string) => void
  emailDisabled: boolean
  nameDisabled: boolean
  onAddReplyQuick: (parentId: string, text: string) => void
  activeReplyToName: string | null
  onClearTag: () => void
}

/**
 * CommentNode - Component đệ quy hiển thị bình luận và tất cả các phản hồi ở bất kỳ độ sâu nào.
 * TẠI SAO dùng đệ quy: Cho phép hiển thị cây bình luận lồng nhau vô hạn cực kỳ linh hoạt và sâu sắc,
 * mỗi node con đều thừa hưởng đầy đủ logic tương tác như bình luận cha.
 */
function CommentItemInner({
  comment,
  depth,
  sessionOwnerId,
  editingId,
  editText,
  editPendingImages,
  setEditPendingImages,
  setEditingId,
  setEditText,
  onSaveEdit,
  onStartEdit,
  onDeleteClick,
  onHelpfulClick,
  onStartReply,
  replyingToId,
  replyText,
  setReplyText,
  replyPendingImages,
  setReplyPendingImages,
  onCancelReply,
  onReplySubmit,
  fullname,
  setFullname,
  email,
  setEmail,
  emailDisabled,
  nameDisabled,
  onAddReplyQuick,
  activeReplyToName,
  onClearTag,
}: CommentNodeProps) {
  const t = useTranslations("HomePage.CommentSection");
  const isOwner = sessionOwnerId && comment.ownerId === sessionOwnerId

  const [replyNationality, setReplyNationality] = React.useState("")
  const [replyNationalityDisabled, setReplyNationalityDisabled] = React.useState(false)
  const [emailError, setEmailError] = React.useState("")

  React.useEffect(() => {
    const nat = getStoredNationality()
    const timer = setTimeout(() => {
      if (nat) {
        setReplyNationality(nat)
        setReplyNationalityDisabled(hasStoredNationality())
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  // TẠI SAO tách hàm renderCommentContent:
  // Tự động phân tách nội dung comment bằng Regex khớp tên riêng có dấu và khoảng trắng để tìm
  // và highlight các thẻ @mention với style chip (nền xanh opacity, text xanh đặc), mang lại giao diện vô cùng hiện đại và cao cấp.
  const renderCommentContent = (content: string) => {
    if (!content) return null
    const regex = /@([A-ZÀ-Ỹ][a-zA-ZÀ-ỹ0-9_.-]*(?:\s+[A-ZÀ-Ỹ][a-zA-ZÀ-ỹ0-9_.-]*)*)/g
    const parts = content.split(regex)
    if (parts.length === 1) return content

    const elements: React.ReactNode[] = []
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        elements.push(
          <span
            key={i}
            className="inline-flex items-center font-extrabold text-[#4dddff] bg-[#0577e8]/15 px-2 py-0.5 rounded-sm text-[14px] hover:bg-[var(--color-primary)]/25 transition-all h-5 leading-none align-middle"
          >
            {parts[i]}
          </span>
        )
      } else {
        elements.push(parts[i])
      }
    }
    return <>{elements}</>
  }

  return (
    <div className={`space-y-4 transition-opacity duration-500 ${comment.isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex gap-4 relative">
        <div className="relative shrink-0 flex items-start justify-center mt-2.5">
          {depth >= 4 && (
            <div
              className="absolute top-[-34px] left-1/2 -translate-x-1/2 h-[34px] w-0.5 bg-[var(--color-border)] opacity-60 pointer-events-none"
              aria-hidden="true"
            />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(comment.authorName)}`}
            alt={comment.authorName}
            className="size-10 rounded-full relative z-10 transition-transform duration-300 hover:scale-105 shadow-sm object-cover"
          />

          {((comment.replies && comment.replies.length > 0) || replyingToId === comment.id) && (
            <div
              className="absolute top-[50px] bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[var(--color-border)] opacity-60 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div
            className={`rounded-2xl p-5 shadow-sm transition-all duration-300 ${
              depth > 0
                ? "border border-[var(--color-primary)]/15 bg-amber-50/20 dark:dark-glass dark:bg-(--color-bg)/20 hover:border-[var(--color-primary)]/30 transition-all"
                : "border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] hover:border-[var(--color-border-strong)]/80 transition-all"
            }`}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-bold font-heading ${
                    depth > 0 ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {comment.authorName}
                </span>
                {comment.authorType === "agent" && (
                  <span className="text-xs font-semibold bg-green-600 text-white px-2 py-0.5 rounded-full font-heading">
                    Support Agent
                  </span>
                )}
                {comment.nationality && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full text-[var(--color-text-secondary)] font-heading">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://flagcdn.com/w40/${comment.countryCode || getCountryCode(comment.nationality)}.png`}
                      alt={comment.nationality}
                      className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-[var(--color-border)]"
                    />
                    {comment.nationality}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] font-body">
                  <Clock className="size-3" />
                  {comment.date}
                </span>
              </div>
            </div>

            {editingId === comment.id ? (
              <div className="space-y-2 mt-2">
                <CommentForm
                  value={editText}
                  onChange={setEditText}
                  rows={3}
                  label="Chỉnh sửa bình luận"
                  pendingImages={editPendingImages}
                  onImagesChange={setEditPendingImages}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)}>
                    Hủy
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={() => onSaveEdit(comment.id)}>
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed font-body whitespace-pre-line">
                  {comment.replyTo && (
                    <span
                      className="inline-flex items-center font-semibold dark:text-[#4dddff] dark:bg-[#0577e8]/15 px-2 py-0.5 rounded-sm text-[14px] mr-1.5 align-middle select-all bg-[#F1E6D3] text-[#DB7E12]"
                      contentEditable="false"
                      suppressContentEditableWarning
                    >
                      {comment.replyTo}
                    </span>
                  )}
                  <span className="align-middle">
                    {comment.originalLanguage === "vi" && comment.translatedContent ? (
                      <>
                        {renderCommentContent(comment.translatedContent)}
                      </>
                    ) : (
                      renderCommentContent(comment.content)
                    )}
                  </span>
                </p>
                {comment.images && comment.images.length > 0 && (
                  <ImageGallery
                    images={comment.images}
                    commentId={comment.id}
                    onAddReplyQuick={(text) => onAddReplyQuick(comment.id, text)}
                  />
                )}
              </div>
            )}
          </div>

          {editingId !== comment.id && (
            <div className="pl-1 flex items-center gap-4 flex-wrap">
              {comment.isPending ? (
                <span className="inline-flex items-center h-7 text-[13px] font-bold font-heading text-[var(--color-primary)] animate-pulse min-w-[120px]">
                  {t("posting")}
                </span>
              ) : (
                <>
                  <button
                    onClick={(e) => onHelpfulClick(comment.id, !!comment.hasVoted, e)}
                    className={`inline-flex items-center gap-1.5 text-sm transition-all focus:outline-none font-bold font-heading  relative z-10 min-w-[120px] border-0 bg-transparent p-0 ${
                      comment.hasVoted
                        ? "text-[var(--color-success)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                    }`}
                  >
                    <ThumbsUp className="size-3 shrink-0" />
                    <span>Helpful ({comment.helpfulCount})</span>
                  </button>
                  <button
                    onClick={() => {
                      const isSelf =
                        (sessionOwnerId && comment.ownerId === sessionOwnerId) ||
                        (fullname && comment.authorName.toLowerCase() === fullname.trim().toLowerCase())
                      onStartReply(comment.id, isSelf ? "" : comment.authorName)
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold font-heading text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all border-0 bg-transparent p-0"
                  >
                    <Reply className="size-3" />
                    Reply
                  </button>

                  {isOwner && (
                    <MoreMenu
                      onEdit={() => onStartEdit(comment.id, comment.content, comment.images)}
                      onDelete={() => onDeleteClick(comment.id)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {(replyingToId === comment.id || (comment.replies && comment.replies.length > 0)) && (
        <div className={`mt-6 space-y-6 ${depth < 3 ? "ml-12 sm:ml-[72px]" : "ml-0"}`}>
          {replyingToId === comment.id && (
            <div className="relative">
              {depth < 3 && (
                <>
                  {comment.replies && comment.replies.length > 0 ? (
                    <>
                      <div
                        className="absolute left-[-28px] sm:left-[-53px] top-[-24px] bottom-0 w-0.5 bg-[var(--color-border)] opacity-60 pointer-events-none"
                        aria-hidden="true"
                      />
                      <div
                        className="absolute left-[-28px] sm:left-[-53px] top-[4px] h-[26px] w-[20px] sm:w-[45px] border-l-2 border-b-2 border-[var(--color-border)] opacity-60 rounded-bl-[16px] pointer-events-none"
                        aria-hidden="true"
                      />
                    </>
                  ) : (
                    <div
                      className="absolute left-[-28px] sm:left-[-53px] top-[-24px] h-[54px] w-[20px] sm:w-[45px] border-l-2 border-b-2 border-[var(--color-border)] opacity-60 rounded-bl-[16px] pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}

              <div className="flex gap-4 relative">
                <div className="relative shrink-0 flex items-start justify-center mt-2.5">
                  {depth >= 3 && (
                    <div
                      className="absolute top-[-34px] left-1/2 -translate-x-1/2 h-[34px] w-0.5 bg-[var(--color-border)] opacity-60 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(fullname || "guest")}`}
                    alt={fullname || "Guest"}
                    className="size-10 rounded-full relative z-10 transition-transform duration-300 hover:scale-105 shadow-sm object-cover"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  {!emailDisabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-extrabold text-[var(--color-text-secondary)] font-heading uppercase mb-1">
                          Họ và Tên *
                        </label>
                        <input
                          type="text"
                          placeholder="Tên của bạn"
                          value={fullname}
                          onChange={(e) => setFullname(e.target.value)}
                          disabled={nameDisabled}
                          className="flex h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-body disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-[var(--color-text-secondary)] font-heading uppercase mb-1">
                          Địa chỉ Email *
                        </label>
                        <input
                          type="email"
                          autoComplete="new-password"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setEmailError("")
                          }}
                          disabled={emailDisabled}
                          className="flex h-10 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-body disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {emailError && (
                          <p className="mt-1.5 text-xs font-semibold text-[var(--color-error)] font-body">
                            {emailError}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-[var(--color-text-secondary)] font-heading uppercase mb-1">
                          Quốc tịch *
                        </label>
                        <Combobox
                          options={COMBOBOX_OPTIONS}
                          value={replyNationality}
                          onValueChange={setReplyNationality}
                          disabled={replyNationalityDisabled}
                          placeholder="Chọn quốc gia"
                          emptyText="Không tìm thấy"
                        />
                      </div>
                    </div>
                  )}
                  <CommentForm
                    value={replyText}
                    onChange={setReplyText}
                    placeholder="Viết câu trả lời của bạn..."
                    rows={2}
                    label="Trả lời"
                    pendingImages={replyPendingImages}
                    onImagesChange={setReplyPendingImages}
                    authorName={activeReplyToName || undefined}
                    onClearTag={onClearTag}
                    submitSlot={
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={onCancelReply}
                          className="h-8 text-xs font-bold"
                        >
                          Hủy
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            const isGuest = !sessionStorage.getItem("comment_email");
                            if (isGuest && email.trim()) {
                              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                              if (!emailRegex.test(email.trim())) {
                                setEmailError("Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.");
                                return;
                              }
                            }
                            onReplySubmit(comment.id, replyNationality);
                          }}
                          disabled={!replyText.trim() && replyPendingImages.length === 0}
                          className="h-8 text-xs font-bold"
                        >
                          <Reply className="size-3 mr-1" />
                          Trả lời
                        </Button>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {comment.replies &&
            comment.replies.map((reply, index) => {
              const isLast = index === comment.replies!.length - 1
              return (
                <div key={reply.clientId || reply.id} className="relative">
                  {depth < 3 && (
                    <>
                      {!isLast ? (
                        <>
                          <div
                            className="absolute left-[-28px] sm:left-[-53px] top-[-24px] bottom-0 w-0.5 bg-[var(--color-border)] opacity-60 pointer-events-none"
                            aria-hidden="true"
                          />
                          <div
                            className="absolute left-[-28px] sm:left-[-53px] top-[4px] h-[26px] w-[20px] sm:w-[45px] border-l-2 border-b-2 border-[var(--color-border)] opacity-60 rounded-bl-[16px] pointer-events-none"
                            aria-hidden="true"
                          />
                        </>
                      ) : (
                        <div
                          className="absolute left-[-28px] sm:left-[-53px] top-[-24px] h-[54px] w-[20px] sm:w-[45px] border-l-2 border-b-2 border-[var(--color-border)] opacity-60 rounded-bl-[16px] pointer-events-none"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}

                  <CommentItem
                    comment={reply}
                    depth={depth + 1}
                    sessionOwnerId={sessionOwnerId}
                    editingId={editingId}
                    editText={editText}
                    editPendingImages={editPendingImages}
                    setEditPendingImages={setEditPendingImages}
                    setEditingId={setEditingId}
                    setEditText={setEditText}
                    onSaveEdit={onSaveEdit}
                    onStartEdit={onStartEdit}
                    onDeleteClick={onDeleteClick}
                    onHelpfulClick={onHelpfulClick}
                    onStartReply={onStartReply}
                    replyingToId={replyingToId}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    replyPendingImages={replyPendingImages}
                    setReplyPendingImages={setReplyPendingImages}
                    onCancelReply={onCancelReply}
                    onReplySubmit={onReplySubmit}
                    fullname={fullname}
                    setFullname={setFullname}
                    email={email}
                    setEmail={setEmail}
                    emailDisabled={emailDisabled}
                    nameDisabled={nameDisabled}
                    onAddReplyQuick={onAddReplyQuick}
                    activeReplyToName={activeReplyToName}
                    onClearTag={onClearTag}
                  />
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function isTargetOrDescendant(c: Comment, targetId: string | null): boolean {
  if (!targetId) return false;
  if (c.id === targetId) return true;
  if (!c.replies) return false;
  return c.replies.some(child => isTargetOrDescendant(child, targetId));
}

export const CommentItem = React.memo(CommentItemInner, (prev, next) => {
  return (
    prev.comment === next.comment &&
    prev.depth === next.depth &&
    prev.sessionOwnerId === next.sessionOwnerId &&
    // Only re-render if we are editing THIS branch
    ((!isTargetOrDescendant(prev.comment, prev.editingId) && !isTargetOrDescendant(next.comment, next.editingId)) ||
      (prev.editText === next.editText && prev.editPendingImages === next.editPendingImages)) &&
    // Only re-render if we are replying to THIS branch
    ((!isTargetOrDescendant(prev.comment, prev.replyingToId) && !isTargetOrDescendant(next.comment, next.replyingToId)) ||
      (prev.replyText === next.replyText && prev.replyPendingImages === next.replyPendingImages && prev.activeReplyToName === next.activeReplyToName)) &&
    prev.fullname === next.fullname &&
    prev.email === next.email &&
    prev.emailDisabled === next.emailDisabled &&
    prev.nameDisabled === next.nameDisabled
  )
})
