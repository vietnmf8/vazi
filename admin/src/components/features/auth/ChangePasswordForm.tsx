"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2 } from "lucide-react"
import { changePassword, verifyOldPassword } from "@/lib/api/auth.api"
import { Button } from "@/components/ui/Button"
import { PasswordInput } from "@/components/ui/PasswordInput"
import { PasswordStrengthMeter } from "./PasswordStrengthMeter"

const schema = z.object({
 oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
 newPassword: z.string()
 .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
 .regex(/[A-Z]/, "Phải chứa ít nhất 1 chữ hoa")
 .regex(/[a-z]/, "Phải chứa ít nhất 1 chữ thường")
 .regex(/[0-9]/, "Phải chứa ít nhất 1 chữ số")
 .regex(/[!@#$%^&*(),.?":{}|<>]/, "Phải chứa ít nhất 1 ký tự đặc biệt"),
 confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
 logoutAll: z.boolean(),
}).superRefine((data, ctx) => {
 if (data.newPassword === data.oldPassword) {
 ctx.addIssue({
 code: z.ZodIssueCode.custom,
 message: "Mật khẩu mới không được trùng mật khẩu hiện tại",
 path: ["newPassword"],
 })
 }
 if (data.newPassword !== data.confirmPassword) {
 ctx.addIssue({
 code: z.ZodIssueCode.custom,
 message: "Mật khẩu xác nhận không khớp",
 path: ["confirmPassword"],
 })
 }
})

type FormValues = z.infer<typeof schema>

interface ChangePasswordFormProps {
 onSuccess?: () => void
 onCancel?: () => void
}

export function ChangePasswordForm({ onSuccess, onCancel }: ChangePasswordFormProps) {
 const [serverError, setServerError] = useState<string | null>(null)
 const [success, setSuccess] = useState(false)
 const [isOldPasswordValid, setIsOldPasswordValid] = useState<boolean | null>(null)

 const {
 register,
 handleSubmit,
 reset,
 watch,
 trigger,
 formState: { errors, isSubmitting },
 } = useForm<FormValues>({
 resolver: zodResolver(schema),
 mode: "onChange",
 defaultValues: {
 logoutAll: true,
 }
 })

 const newPasswordValue = watch("newPassword")
 const oldPasswordValue = watch("oldPassword")
 const confirmPasswordValue = watch("confirmPassword")

 useEffect(() => {
 if (newPasswordValue || confirmPasswordValue) {
 trigger(["newPassword", "confirmPassword"])
 }
 }, [oldPasswordValue, trigger])

 useEffect(() => {
 if (!oldPasswordValue) {
 setIsOldPasswordValid(null)
 return
 }
 const timer = setTimeout(async () => {
 try {
 const res = await verifyOldPassword(oldPasswordValue)
 setIsOldPasswordValid(res.isValid)
 } catch (err) {
 setIsOldPasswordValid(false)
 }
 }, 500)
 return () => clearTimeout(timer)
 }, [oldPasswordValue])

 const onSubmit = async (values: FormValues) => {
 setServerError(null)
 setSuccess(false)
 try {
 await changePassword({
 oldPassword: values.oldPassword,
 newPassword: values.newPassword,
 logoutAll: values.logoutAll,
 })
 setSuccess(true)
 setTimeout(() => {
 reset()
 setIsOldPasswordValid(null)
 setSuccess(false)
 onSuccess?.()
 }, 2000)
 } catch (err: any) {
 const code = err.response?.data?.error?.code
 if (code === "INVALID_OLD_PASSWORD") {
 setServerError("Mật khẩu hiện tại không đúng")
 } else {
 setServerError("Đã xảy ra lỗi khi đổi mật khẩu")
 }
 }
 }

 if (success) {
 return (
 <div className="p-4 text-center text-green-600 bg-green-50 rounded-lg border border-green-200 mt-4">
 Đổi mật khẩu thành công!
 </div>
 )
 }

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
 <div className="space-y-1">
 <label className="text-sm text-gray-500 flex justify-between items-center" style={{ color: "var(--color-text-muted)" }}>
 <span>Mật khẩu hiện tại</span>
 {isOldPasswordValid === true && (
 <span className="flex items-center text-xs text-green-600">
 <CheckCircle2 className="size-3 mr-1" /> Mật khẩu hợp lệ
 </span>
 )}
 </label>
 <PasswordInput {...register("oldPassword")} autoComplete="current-password" />
 {errors.oldPassword && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.oldPassword.message}</p>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-sm text-gray-500 flex justify-between items-center" style={{ color: "var(--color-text-muted)" }}>
 <span>Mật khẩu mới</span>
 {!errors.newPassword && newPasswordValue && newPasswordValue.length >= 8 && (
 <span className="flex items-center text-xs text-green-600">
 <CheckCircle2 className="size-3 mr-1" /> Mật khẩu hợp lệ
 </span>
 )}
 </label>
 <PasswordInput {...register("newPassword")} />
 <PasswordStrengthMeter password={newPasswordValue} oldPassword={oldPasswordValue} />
 {errors.newPassword && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.newPassword.message}</p>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-sm text-gray-500 flex justify-between items-center" style={{ color: "var(--color-text-muted)" }}>
 <span>Xác nhận mật khẩu mới</span>
 {!errors.confirmPassword && confirmPasswordValue && confirmPasswordValue === newPasswordValue && (
 <span className="flex items-center text-xs text-green-600">
 <CheckCircle2 className="size-3 mr-1" /> Khớp mật khẩu
 </span>
 )}
 </label>
 <PasswordInput {...register("confirmPassword")} />
 {errors.confirmPassword && (
 <p className="text-sm text-red-500" style={{ color: "var(--color-error)" }}>{errors.confirmPassword.message}</p>
 )}
 </div>

 <div className="flex items-center space-x-2 pt-2">
 <input 
 type="checkbox" 
 id="logoutAll" 
 {...register("logoutAll")}
 className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
 />
 <label 
 htmlFor="logoutAll" 
 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
 style={{ color: "var(--color-text-primary)" }}
 >
 Đăng xuất khỏi các thiết bị khác
 </label>
 </div>

 {serverError && (
 <p className="text-sm p-2 rounded-lg border" style={{ color: "var(--color-error)", backgroundColor: "color-mix(in srgb, var(--color-error) 10%, transparent)", borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)" }}>
 {serverError}
 </p>
 )}

 <div className="flex justify-end gap-2 pt-4">
 {onCancel && (
 <Button type="button" variant="outline" onClick={onCancel}>
 Hủy
 </Button>
 )}
 <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white" style={{ backgroundColor: "var(--color-primary, #2563eb)", color: "white" }}>
 {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
 </Button>
 </div>
 </form>
 )
}
