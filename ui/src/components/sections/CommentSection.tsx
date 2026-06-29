"use client";

import * as React from "react";
import { AnimatePresence, m } from "framer-motion";
import { createPortal } from "react-dom";
import { MessageSquare, HelpCircle, Send, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { useTranslations } from "next-intl";

import { useCommentSection } from "./comments/hooks/useCommentSection";
import { COMBOBOX_OPTIONS } from "./comments/constants";
import { CommentForm } from "./comments/CommentForm";
import { CommentItem } from "./comments/CommentItem";
import {
  triggerConfettiBurst,
} from "./comments/helpers";
// MOCK_COMMENTS moved to constants.tsx
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * ConfirmDeleteModal - Modal xác nhận xóa bình luận sử dụng React Portal và Framer Motion.
 */
function ConfirmDeleteModal({ isOpen, onClose, onConfirm }: ConfirmDeleteModalProps) {
  const t = useTranslations("HomePage.CommentSection");
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <m.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full max-w-sm rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--color-text-primary)] font-heading mb-2">
          {t("confirm_delete_title")}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] font-body leading-relaxed mb-6">
          {t("confirm_delete_desc")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-black dark:text-white bg-transparent hover:bg-[var(--color-surface-2)] rounded-xl transition-all border-0"
          >
            {t("no")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-extrabold text-white dark:text-black bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 rounded-xl transition-all border-0 shadow-sm"
          >
            {t("yes")}
          </button>
        </div>
      </m.div>
    </m.div>,
    document.body
  );
}

/**
 * CommentSection - Orchestrator quản lý toàn bộ luồng hỏi đáp, bình luận và phản hồi.
 * Tách nhỏ 2518 dòng thành cấu trúc các sub-components sạch đẹp nằm trong thư mục comments/.
 */
export function CommentSection() {
  const t = useTranslations("HomePage.CommentSection");
  const {
    comments,
    sessionOwnerId,
    nameDisabled,
    emailDisabled,
    fullname,
    setFullname,
    email,
    setEmail,
    nationality,
    setNationality,
    nationalityDisabled,
    activeReplyToName,
    setActiveReplyToName,
    message,
    setMessage,
    isSubmitting,
    emailError,
    setEmailError,
    pendingImages,
    setPendingImages,
    editPendingImages,
    setEditPendingImages,
    replyPendingImages,
    setReplyPendingImages,
    editingId,
    setEditingId,
    editText,
    setEditText,
    replyingToId,
    replyText,
    setReplyText,
    deleteConfirmId,
    setDeleteConfirmId,
    handleSaveEdit,
    handleStartEdit,
    realHandleDelete,
    handleHelpful,
    handleInlineSubmit,
    handleReplySubmit,
    handleReplyQuick,
    startReply,
    cancelReply,
  } = useCommentSection();

  return (
    <>
      <Toaster position="bottom-center" />
      <section
        id="comments"
        data-ai-target="comments"
        className="w-full py-16 reveal-on-scroll"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-5">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2 font-heading">
                  <MessageSquare className="size-5 text-[var(--color-primary)]" />
                  {t("title")}
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] mt-1 font-body">
                  {comments.length +
                    comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)}{" "}
                  {t("entries_in_discussion")}
                </p>
              </div>
            </div>

            {/* Quick Inquiry Form */}
            <div className="mx-auto max-w-3xl pt-6">
              <h4 className="section-subtitle !text-base mb-4 flex items-center gap-2">
                <HelpCircle className="size-4 text-[var(--color-primary)]" />
                {t("quick_inquiry")}
              </h4>

              <form onSubmit={handleInlineSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--color-text-secondary)] font-heading mb-1.5">
                      {t("full_name")}
                    </label>
                    <input
                      type="text"
                      data-ai-field="name"
                      placeholder={t("full_name_placeholder")}
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      disabled={nameDisabled}
                      required
                      className="flex h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-body disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--color-text-secondary)] font-heading mb-1.5">
                      {t("email")}
                    </label>
                    <input
                      type="email"
                      data-ai-field="email"
                      autoComplete="new-password"
                      placeholder={t("email_placeholder")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      disabled={emailDisabled}
                      required
                      className="flex h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-body disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    {emailError && (
                      <p className="mt-1.5 text-xs font-semibold text-[var(--color-error)] font-body">
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--color-text-secondary)] font-heading mb-1.5">
                      {t("nationality")}
                    </label>
                    <Combobox
                      options={COMBOBOX_OPTIONS}
                      value={nationality}
                      onValueChange={setNationality}
                      disabled={nationalityDisabled}
                      placeholder={t("select_country")}
                      emptyText={t("no_country")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--color-text-secondary)] font-heading mb-1.5">
                    {t("your_question")}
                  </label>
                  <CommentForm
                    value={message}
                    onChange={setMessage}
                    placeholder={t("question_placeholder")}
                    rows={3}
                    label={t("your_question")}
                    pendingImages={pendingImages}
                    onImagesChange={setPendingImages}
                    submitSlot={
                      <Button
                        type="submit"
                        variant="default"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={!message.trim() && pendingImages.length === 0}
                        className="h-8 w-8 px-0 shrink-0"
                        aria-label="Submit Question"
                      >
                        {!isSubmitting && <Send className="size-3.5" />}
                      </Button>
                    }
                  />
                </div>
              </form>
            </div>

            {/* Threads List với Đệ Quy Vô Hạn */}
            <div className="space-y-6 pt-2">
              {comments.map((comment) => (
                <div
                  key={comment.clientId || comment.id}
                  className="space-y-4 border-b border-[var(--color-border)] pb-6 last:border-0 last:pb-0"
                >
                  <div className="relative">
                    <CommentItem
                      comment={comment}
                      depth={0}
                      sessionOwnerId={sessionOwnerId}
                      editingId={editingId}
                      editText={editText}
                      editPendingImages={editPendingImages}
                      setEditPendingImages={setEditPendingImages}
                      setEditingId={setEditingId}
                      setEditText={setEditText}
                      onSaveEdit={handleSaveEdit}
                      onStartEdit={handleStartEdit}
                      onDeleteClick={(id) => setDeleteConfirmId(id)}
                      onHelpfulClick={handleHelpful}
                      onStartReply={startReply}
                      replyingToId={replyingToId}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      replyPendingImages={replyPendingImages}
                      setReplyPendingImages={setReplyPendingImages}
                      onCancelReply={cancelReply}
                      onReplySubmit={handleReplySubmit}
                      fullname={fullname}
                      setFullname={setFullname}
                      email={email}
                      setEmail={setEmail}
                      emailDisabled={emailDisabled}
                      nameDisabled={nameDisabled}
                      onAddReplyQuick={handleReplyQuick}
                      activeReplyToName={activeReplyToName}
                      onClearTag={() => setActiveReplyToName(null)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portal Confirm Delete Modal bọc trong AnimatePresence */}
        <AnimatePresence>
          {deleteConfirmId !== null && (
            <ConfirmDeleteModal
              isOpen={true}
              onClose={() => setDeleteConfirmId(null)}
              onConfirm={() => {
                if (deleteConfirmId) {
                  realHandleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            />
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
