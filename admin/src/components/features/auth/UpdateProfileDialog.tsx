"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect, useRef } from "react"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { updateProfile } from "@/lib/api/auth.api"
import { useAuthMe } from "@/lib/api/auth.api"
import { AvatarUploadField } from "./AvatarUploadField"
import { ChangePasswordForm } from "./ChangePasswordForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const updateProfileSchema = z.object({
 fullName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
 phone: z.string().optional(),
 avatarUrl: z.string().optional(),
})

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>

type UpdateProfileDialogProps = {
 open: boolean
 onOpenChange: (open: boolean) => void
 initialTab?: "profile" | "password"
}

export function UpdateProfileDialog({ open, onOpenChange, initialTab = "profile" }: UpdateProfileDialogProps) {
 const [serverError, setServerError] = useState<string | null>(null)
 const [success, setSuccess] = useState(false)
 // Dùng ref để ngăn useEffect reset form khi dialog đang trong quá trình đóng sau thành công
 const isClosingRef = useRef(false)
 
 const { user, mutate } = useAuthMe()

 const {
 register,
 handleSubmit,
 reset,
 setValue,
 watch,
 formState: { errors, isSubmitting },
 } = useForm<UpdateProfileFormValues>({
 resolver: zodResolver(updateProfileSchema),
 })

 const avatarUrlValue = watch("avatarUrl")

 const [activeTab, setActiveTab] = useState<"profile" | "password">(initialTab)

 useEffect(() => {
 // Bỏ qua nếu đang trong quá trình đóng dialog sau thành công — tránh flicker
 if (user && open && !isClosingRef.current) {
 reset({
 fullName: user.fullName || "",
 phone: user.phone || "",
 avatarUrl: user.avatarUrl || "",
 })
 setSuccess(false)
 setServerError(null)
 setActiveTab(initialTab)
 }
 }, [user, open, reset, initialTab])

 const onSubmit = async (values: UpdateProfileFormValues) => {
 setServerError(null)
 setSuccess(false)
 try {
 await updateProfile(values)
 // Đánh dấu đang đóng trước khi mutate để useEffect không reset form
 isClosingRef.current = true
 mutate() // Refresh user data ngầm, không gây re-render form
 setSuccess(true)
 // Đóng dialog ngay sau khi hiện thông báo thành công
 setTimeout(() => {
 onOpenChange(false)
 isClosingRef.current = false
 }, 1200)
 } catch {
 isClosingRef.current = false
 setServerError("Có lỗi xảy ra, vui lòng thử lại sau.")
 }
 }

 const handleOpenChange = (isOpen: boolean) => {
 if (!isOpen) {
 // Reset flag khi dialog đóng theo bất kỳ cách nào (bấm X, ESC...)
 isClosingRef.current = false
 setServerError(null)
 setSuccess(false)
 }
 onOpenChange(isOpen)
 }

 return (
 <Dialog open={open} onOpenChange={handleOpenChange}>
 <DialogContent className="sm:max-w-md" style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)" }}>
 <DialogHeader>
 <DialogTitle style={{ color: "var(--color-text-primary)" }}>Cập nhật hồ sơ</DialogTitle>
 <DialogDescription style={{ color: "var(--color-text-muted)" }}>
 Chỉnh sửa thông tin cá nhân của bạn.
 </DialogDescription>
 </DialogHeader>

 <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
 <TabsList 
 className="w-full grid grid-cols-2 mb-4 p-1"
 style={{ backgroundColor: "var(--color-surface-base)" }}
 >
 <TabsTrigger 
 value="profile" 
 className="rounded-md transition-colors data-[state=active]:!bg-[var(--color-primary)] data-[state=active]:!text-white"
 >
 Hồ sơ
 </TabsTrigger>
 <TabsTrigger 
 value="password" 
 className="rounded-md transition-colors data-[state=active]:!bg-[var(--color-primary)] data-[state=active]:!text-white"
 >
 Đổi mật khẩu
 </TabsTrigger>
 </TabsList>

 <TabsContent value="profile">
 {success ? (
 <div className="py-6 text-center space-y-4">
 <p className="text-green-600 font-medium">Cập nhật thông tin thành công!</p>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
 <div className="flex justify-center">
 <AvatarUploadField
 value={avatarUrlValue || ""}
 onChange={(url) => setValue("avatarUrl", url, { shouldDirty: true })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-sm text-gray-500" style={{ color: "var(--color-text-muted)" }}>Họ và tên</label>
 <Input {...register("fullName")} />
 {errors.fullName && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.fullName.message}</p>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-sm text-gray-500" style={{ color: "var(--color-text-muted)" }}>Số điện thoại</label>
 <Input {...register("phone")} />
 {errors.phone && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.phone.message}</p>
 )}
 </div>

 {serverError && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{serverError}</p>
 )}

 <div className="flex justify-end gap-2 pt-4">
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
 Hủy
 </Button>
 <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
 {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
 </Button>
 </div>
 </form>
 )}
 </TabsContent>
 <TabsContent value="password">
 <ChangePasswordForm 
 onCancel={() => onOpenChange(false)} 
 onSuccess={() => {
 setTimeout(() => {
 onOpenChange(false)
 }, 1000)
 }} 
 />
 </TabsContent>
 </Tabs>
 </DialogContent>
 </Dialog>
 )
}

