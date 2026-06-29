"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateApplicationStatus } from "@/lib/api/applications.api"
import {
    ADMIN_STATUS_TRANSITIONS,
    getAdminStatusLabel,
} from "@/lib/application-status"
import { getStatusStyle } from "@/lib/status"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import type { VisaApplicationStatus } from "@/types/api"
import { SendCompletedEmailModal } from "./SendCompletedEmailModal"

interface StatusDropdownProps {
    applicationId: string
    currentStatus: VisaApplicationStatus
    readonly?: boolean
    application?: any
}

/**
 * Dropdown đổi trạng thái inline trên bảng admin.
 * 3 trạng thái: Đang xử lý (PAID/PROCESSING) → Xử lý thành công / Từ chối.
 * Chọn option → Lưu mới gọi API (và server mới gửi email COMPLETED).
 */
export function StatusDropdown({ applicationId, currentStatus, readonly, application }: StatusDropdownProps) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<VisaApplicationStatus | null>(null)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()

    const validNextStatuses = ADMIN_STATUS_TRANSITIONS[currentStatus] ?? []
    const hasTransitions = validNextStatuses.length > 0

    const mutation = useMutation({
        mutationFn: ({ newStatus, templateName }: { newStatus: VisaApplicationStatus; templateName?: string }) =>
            updateApplicationStatus(applicationId, newStatus, templateName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["applications"] })
            queryClient.invalidateQueries({ queryKey: ["applications", applicationId] })
            queryClient.invalidateQueries({ queryKey: ["applications", applicationId, "audit-logs"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            showToast(t("applications.saved"), "success")
            closeDropdown()
        },
        onError: () => {
            showToast(t("common.error"), "error")
            closeDropdown()
        },
    })

    function closeDropdown() {
        setOpen(false)
        setSelected(null)
    }

    function handleToggle(e: React.MouseEvent) {
        e.stopPropagation()
        if (mutation.isPending) return

        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 4, left: rect.left })
        }
        if (open) {
            closeDropdown()
        } else {
            setOpen(true)
        }
    }

    function handleSave(e: React.MouseEvent) {
        e.stopPropagation()
        if (selected) {
            if (selected === "COMPLETED") {
                setIsModalOpen(true)
                closeDropdown()
            } else {
                mutation.mutate({ newStatus: selected })
            }
        }
    }

    function handleCancel(e: React.MouseEvent) {
        e.stopPropagation()
        closeDropdown()
    }

    useEffect(() => {
        if (!open) return

        function handleClickOutside(e: MouseEvent) {
            if (
                buttonRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return
            closeDropdown()
        }

        function handleScroll() {
            closeDropdown()
        }

        document.addEventListener("mousedown", handleClickOutside)
        window.addEventListener("scroll", handleScroll, true)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            window.removeEventListener("scroll", handleScroll, true)
        }
    }, [open])

    const badgeStyle = getStatusStyle(currentStatus)
    const badgeLabel = getAdminStatusLabel(currentStatus)

    if (!hasTransitions || readonly) {
        return (
            <span
                className="inline-flex items-center justify-center rounded-md px-2.5 py-1 font-medium text-center"
                style={{ fontSize: "var(--font-size-sm)", minWidth: "135px", ...badgeStyle }}
            >
                {badgeLabel}
            </span>
        )
    }

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center rounded-md px-2.5 py-1 font-medium transition-opacity hover:opacity-80"
                style={{
                    fontSize: "var(--font-size-sm)",
                    minWidth: "135px",
                    cursor: mutation.isPending ? "not-allowed" : "pointer",
                    ...badgeStyle,
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={mutation.isPending}
            >
                <span className="flex-1 text-center">{badgeLabel}</span>
                {mutation.isPending ? (
                    <svg className="flex-none animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                ) : (
                    <svg className="flex-none" width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </button>

            {open && dropdownPos && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 9999,
                        border: "1px solid var(--color-border-default)",
                        backgroundColor: "var(--color-surface-elevated)",
                        borderRadius: "8px",
                        padding: "6px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        minWidth: "168px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-1 mb-2">
                        {validNextStatuses.map((nextStatus) => {
                            const isSelected = selected === nextStatus
                            return (
                                <button
                                    key={nextStatus}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setSelected(isSelected ? null : nextStatus)
                                    }}
                                    className="flex w-full items-center rounded-md px-2.5 py-1.5 font-medium transition-all"
                                    style={{
                                        fontSize: "var(--font-size-sm)",
                                        cursor: "pointer",
                                        outline: isSelected ? "2px solid currentColor" : "none",
                                        outlineOffset: "-1px",
                                        opacity: selected && !isSelected ? 0.5 : 1,
                                        ...getStatusStyle(nextStatus),
                                    }}
                                >
                                    {getAdminStatusLabel(nextStatus)}
                                    {isSelected && (
                                        <svg className="ml-auto" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {selected && (
                        <div
                            className="flex gap-2 pt-2"
                            style={{ borderTop: "1px solid var(--color-border-default)" }}
                        >
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={mutation.isPending}
                                className="flex-1 rounded-md py-1 font-medium transition-opacity hover:opacity-80"
                                style={{
                                    fontSize: "var(--font-size-sm)",
                                    border: "1px solid var(--color-border-strong)",
                                    backgroundColor: "var(--color-surface-base)",
                                    color: "var(--color-text-primary)",
                                    cursor: "pointer",
                                }}
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={mutation.isPending}
                                className="flex-1 rounded-md py-1 font-medium transition-opacity hover:opacity-80"
                                style={{
                                    fontSize: "var(--font-size-sm)",
                                    border: "none",
                                    backgroundColor: "var(--color-primary)",
                                    color: "#fff",
                                    cursor: mutation.isPending ? "not-allowed" : "pointer",
                                    opacity: mutation.isPending ? 0.7 : 1,
                                }}
                            >
                                {mutation.isPending ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <SendCompletedEmailModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={(templateName) => {
                        mutation.mutate(
                            { newStatus: "COMPLETED", templateName },
                            { onSuccess: () => setIsModalOpen(false) }
                        )
                    }}
                    isPending={mutation.isPending}
                    application={application}
                />
            )}
        </>
    )
}
