import { useState, useEffect } from "react"

interface SendCompletedEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (templateName: string) => void
    isPending: boolean
    application?: any
}

export function SendCompletedEmailModal({ isOpen, onClose, onConfirm, isPending, application }: SendCompletedEmailModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState("e-visa")

    // Khi modal mở, tự động chọn template phù hợp
    useEffect(() => {
        if (isOpen && application) {
            const isEvisa = application.visa_type === "E_VISA";
            const isVoa = application.visa_type === "VOA";
            const hasFastTrack = application.extra_services?.vip_fast_track || application.extra_services?.basic_fast_track;
            
            if (isEvisa && hasFastTrack) {
                setSelectedTemplate("evisa_fast_track");
            } else if (isVoa && hasFastTrack) {
                setSelectedTemplate("voa_fast_track");
            } else if (hasFastTrack) {
                setSelectedTemplate("fast_track");
            } else if (isVoa) {
                setSelectedTemplate("voa");
            } else {
                setSelectedTemplate("e-visa");
            }
        }
    }, [isOpen, application])

    const isEvisa = application?.visa_type === "E_VISA";
    const isVoa = application?.visa_type === "VOA";
    const hasFastTrack = application?.extra_services?.vip_fast_track || application?.extra_services?.basic_fast_track;
    
    const missingDocs: string[] = [];
    if (application) {
        if (!application.resultDocumentPublicId) {
            missingDocs.push(isEvisa ? "Tệp đính kèm E-Visa" : "Công văn chấp thuận VOA");
        }
        if (hasFastTrack && !application.pickupPointImagePublicId) {
            missingDocs.push("Ảnh điểm đón");
        }
    }

    const canSubmit = missingDocs.length === 0;

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl p-6 shadow-xl" style={{ backgroundColor: "var(--color-surface-elevated)" }}>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Chọn Template Email
                </h3>
                <p className="mb-4 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                    Vui lòng chọn template email để gửi thông báo hoàn tất cho khách hàng.
                </p>

                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        Email Template
                    </label>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                        style={{ 
                            borderColor: "var(--color-border-default)", 
                            backgroundColor: "var(--color-surface-base)",
                            color: "var(--color-text-primary)"
                        }}
                    >
                        <option value="e-visa">E-Visa</option>
                        <option value="voa">VOA</option>
                        <option value="fast_track">Fast Track</option>
                        <option value="evisa_fast_track">E-Visa + Fast Track</option>
                        <option value="voa_fast_track">VOA + Fast Track</option>
                    </select>

                    {missingDocs.length > 0 && (
                        <div className="mt-3 rounded-md p-3 text-sm" style={{ backgroundColor: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #ef4444)", border: "1px solid var(--color-error, #ef4444)" }}>
                            <strong>Không thể lưu trạng thái thành công:</strong>
                            <ul className="list-disc pl-5 mt-1">
                                {missingDocs.map((doc, idx) => (
                                    <li key={idx}>Thiếu <strong>{doc}</strong></li>
                                ))}
                            </ul>
                            <p className="mt-1 text-xs">Vui lòng tải lên các tệp đính kèm bắt buộc trước khi xử lý thành công.</p>
                        </div>
                    )}
                    
                    {missingDocs.length === 0 && selectedTemplate.includes("fast_track") && (
                        <p className="mt-2 text-xs" style={{ color: "var(--color-warning)" }}>
                            Lưu ý: Template này yêu cầu "Ảnh điểm đón" (Pickup Point Image). Bạn đã upload thành công.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50"
                        style={{ 
                            borderColor: "var(--color-border-strong)",
                            backgroundColor: "transparent",
                            color: "var(--color-text-primary)"
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedTemplate)}
                        disabled={isPending || !canSubmit}
                        className="rounded-md px-4 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: canSubmit ? "var(--color-primary)" : "var(--color-border-default)",
                            color: canSubmit ? "#fff" : "var(--color-text-muted)"
                        }}
                    >
                        {isPending ? "Đang gửi..." : "Lưu & Gửi Email"}
                    </button>
                </div>
            </div>
        </div>
    )
}
