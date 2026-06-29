"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { showToast } from "@/components/ui/Toast"
import { updateApplication } from "@/lib/api/applications.api"
import { t } from "@/lib/i18n"
import type { AdminApplicationDetail, AdminApplicationUpdatePayload } from "@/types/api"

type ApplicationEditFormProps = {
 application: AdminApplicationDetail
}

function toPayload(app: AdminApplicationDetail): AdminApplicationUpdatePayload {
 return {
 contact_email: app.contact_email,
 contact_phone: app.contact_phone,
 visa_type: app.visa_type,
 visa_category: app.visa_category,
 purpose_of_visit: app.purpose_of_visit,
 arrival_date: app.arrival_date,
 port_of_entry: app.port_of_entry ?? "",
 processing_time: app.processing_time,
 applicant_count: app.applicant_count,
 extra_services: {
 vip_fast_track:
 app.extra_services?.vip_fast_track === true ? true : undefined,
 basic_fast_track:
 app.extra_services?.basic_fast_track === true ? true : undefined,
 },
 applicants: app.applicants.map((a) => ({
 id: a.id,
 full_name: a.full_name,
 gender: a.gender,
 nationality: a.nationality,
 date_of_birth: a.date_of_birth,
 passport_number: a.passport_number,
 passport_expiry_date: a.passport_expiry_date,
 passport_image_url: a.passport_image_url,
 portrait_image_url: a.portrait_image_url ?? undefined,
 flight_ticket_url: a.flight_ticket_url ?? undefined,
 })),
 }
}

/**
 * Form chỉnh sửa đầy đủ thông tin đơn visa (admin) — gửi PATCH /admin/applications/:id.
 */
export function ApplicationEditForm({ application }: ApplicationEditFormProps) {
 const queryClient = useQueryClient()
 const [form, setForm] = useState<AdminApplicationUpdatePayload>(() => toPayload(application))

 const mutation = useMutation({
 mutationFn: () => updateApplication(application.id, form),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["applications", application.id] })
 queryClient.invalidateQueries({ queryKey: ["applications", application.id, "audit-logs"] })
 queryClient.invalidateQueries({ queryKey: ["applications"] })
 showToast(t("applications.editSaved"), "success")
 },
 onError: () => showToast(t("common.error"), "error"),
 })

 const updateApplicant = (
 index: number,
 field: keyof AdminApplicationUpdatePayload["applicants"][number],
 value: string,
 ) => {
 setForm((prev) => {
 const applicants = [...prev.applicants]
 applicants[index] = { ...applicants[index]!, [field]: value }
 return { ...prev, applicants }
 })
 }

 return (
 <form
 className="space-y-4"
 onSubmit={(e) => {
 e.preventDefault()
 mutation.mutate()
 }}
 >
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.colEmail")}
 </span>
 <Input value={form.contact_email} disabled />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.contactPhone")}
 </span>
 <Input value={form.contact_phone} disabled />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.arrivalDate")}
 </span>
 <Input type="date" value={form.arrival_date} disabled />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.portOfEntry")}
 </span>
 <Input value={form.port_of_entry} disabled />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.colType")}
 </span>
 <select
 value={form.visa_type}
 disabled
 className="w-full rounded-lg px-3 py-2 min-h-11 disabled:opacity-70 disabled:cursor-not-allowed"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-base)",
 }}
 >
 <option value="E_VISA">E_VISA</option>
 <option value="VOA">VOA</option>
 </select>
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.visaCategory")}
 </span>
 <Input 
    value={
        form.visa_category + 
        (form.extra_services?.vip_fast_track ? " (+ VIP Fast Track)" : 
         form.extra_services?.basic_fast_track ? " (+ Basic Fast Track)" : "")
    } 
    disabled 
 />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.processingTime")}
 </span>
 <Input value={form.processing_time} disabled />
 </label>
 <label className="space-y-1 block">
 <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {t("applications.purposeOfVisit")}
 </span>
 <select
 value={form.purpose_of_visit}
 disabled
 className="w-full rounded-lg px-3 py-2 min-h-11 disabled:opacity-70 disabled:cursor-not-allowed"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-base)",
 }}
 >
 <option value="TOURIST">TOURIST</option>
 <option value="BUSINESS">BUSINESS</option>
 <option value="OTHER">OTHER</option>
 </select>
 </label>
 </div>

 <div className="space-y-3">
 <h3 className="font-medium">{t("applications.applicants")}</h3>
 {form.applicants.map((applicant, index) => (
 <div
 key={applicant.id ?? index}
 className="rounded-lg p-4 space-y-3"
 style={{
 border: "1px solid var(--color-border-default)",
 backgroundColor: "var(--color-surface-base)",
 }}
 >
 <p className="font-medium text-sm">
 {t("applications.applicantIndex").replace("{index}", String(index + 1))}
 </p>
 <div className="grid gap-3 sm:grid-cols-2">
 <Input
 value={applicant.full_name}
 disabled
 placeholder={t("applications.fullName")}
 />
 <Input
 value={applicant.passport_number}
 disabled
 placeholder={t("applications.passportNumber")}
 />
 <Input
 value={applicant.nationality}
 disabled
 placeholder={t("applications.nationality")}
 />
 <select
 value={applicant.gender}
 disabled
 className="rounded-lg px-3 py-2 min-h-11 disabled:opacity-70 disabled:cursor-not-allowed"
 style={{
 border: "1px solid var(--color-border-strong)",
 backgroundColor: "var(--color-surface-elevated)",
 }}
 >
 <option value="MALE">MALE</option>
 <option value="FEMALE">FEMALE</option>
 <option value="OTHER">OTHER</option>
 </select>
 <Input
 type="date"
 value={applicant.date_of_birth}
 disabled
 />
 <Input
 type="date"
 value={applicant.passport_expiry_date}
 disabled
 />
 </div>
 </div>
 ))}
 </div>


 </form>
 )
}
