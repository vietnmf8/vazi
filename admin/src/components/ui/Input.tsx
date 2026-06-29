import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
 ({ className, style, ...props }, ref) => {
 return (
 <input
 ref={ref}
 className={cn(
 "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors",
 "placeholder:opacity-40",
 "focus:ring-0",
 className,
 )}
 style={{
 backgroundColor: "var(--color-surface-base)",
 border: "1px solid var(--color-border-default)",
 color: "var(--color-text-primary)",
 fontSize: "var(--font-size-md)",
 ...style,
 }}
 autoComplete="off"
 {...props}
 />
 )
 },
)

Input.displayName = "Input"
