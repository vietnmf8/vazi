import * as React from "react"
import { useState, forwardRef } from "react"
import { Input } from "@/components/ui/Input"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
 ({ className, ...props }, ref) => {
 const [showPassword, setShowPassword] = useState(false)

 return (
 <div className="relative">
 <Input
 type={showPassword ? "text" : "password"}
 className={cn("pr-10", className)}
 ref={ref}
 {...props}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
 >
 {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 </div>
 )
 }
)
PasswordInput.displayName = "PasswordInput"
