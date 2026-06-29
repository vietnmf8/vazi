import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

interface PasswordStrengthMeterProps {
 password?: string
 oldPassword?: string
}

export function PasswordStrengthMeter({ password, oldPassword }: PasswordStrengthMeterProps) {
 const rules = [
 { label: "Ít nhất 8 ký tự", met: (password || "").length >= 8 },
 { label: "Có chữ hoa (A-Z)", met: /[A-Z]/.test(password || "") },
 { label: "Có chữ thường (a-z)", met: /[a-z]/.test(password || "") },
 { label: "Có số (0-9)", met: /[0-9]/.test(password || "") },
 { label: "Có ký tự đặc biệt", met: /[!@#$%^&*(),.?":{}|<>]/.test(password || "") },
 { label: "Không trùng mật khẩu cũ", met: !!password && password !== oldPassword },
]

 const strength = rules.filter((r) => r.met).length
 const maxStrength = rules.length

 const getStrengthColor = () => {
 if (strength === 0) return "bg-gray-200"
 if (strength <= 2) return "bg-red-500"
 if (strength <= 4) return "bg-orange-500"
 if (strength === maxStrength) return "bg-green-500"
 return "bg-yellow-500"
 }

 const getStrengthLabel = () => {
 if (strength === 0) return ""
 if (strength <= 2) return "Yếu"
 if (strength <= 4) return "Trung bình"
 if (strength === maxStrength) return "Mạnh"
 return "Khá"
 }

 return (
 <div className="space-y-3 mt-2">
 <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
 <div
 className={cn("h-full transition-all duration-300", getStrengthColor())}
 style={{ width: `${(strength / maxStrength) * 100}%` }}
 />
 </div>
 {strength > 0 && <p className="text-xs text-right text-gray-500">{getStrengthLabel()}</p>}
 <ul className="text-xs space-y-1.5 text-gray-600">
 {rules.map((rule, idx) => (
 <li key={idx} className="flex items-center gap-2">
 {rule.met ? <Check size={14} className="text-green-500" /> : <X size={14} className="text-gray-300" />}
 <span className={rule.met ? "text-gray-900" : ""}>{rule.label}</span>
 </li>
 ))}
 </ul>
 </div>
 )
}
