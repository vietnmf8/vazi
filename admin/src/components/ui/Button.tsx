import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
 "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
 {
 variants: {
 variant: {
 default: "bg-primary text-white hover:bg-primary/90",
 destructive: "bg-red-600 text-white hover:bg-red-700",
 outline: "border border-border-strong bg-transparent hover:bg-surface-elevated text-text-primary",
 ghost: "bg-transparent hover:bg-surface-elevated text-text-primary",
 success: "bg-emerald-600 text-white hover:bg-emerald-700",
 },
 size: {
 default: "h-9 px-4 py-2",
 sm: "px-3 py-1.5 text-xs",
 md: "px-4 py-2 text-sm",
 lg: "px-5 py-2.5 text-sm",
 icon: "h-9 w-9",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "md",
 },
 },
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, style, ...props }: ButtonProps) {
 const Comp = asChild ? Slot : "button"

 const variantStyles: React.CSSProperties =
 variant === "default"
 ? { backgroundColor: "var(--color-text-primary)", color: "var(--color-surface-base)" }
 : variant === "outline"
 ? {
 backgroundColor: "transparent",
 color: "var(--color-text-primary)",
 border: "1px solid var(--color-border-default)",
 }
 : variant === "destructive"
 ? {
 backgroundColor: "var(--color-error, #dc2626)",
 color: "#ffffff",
 }
 : {
 backgroundColor: "transparent",
 color: "var(--color-text-muted)",
 }

 return (
 <Comp
 className={cn(buttonVariants({ variant, size }), className)}
 style={{ ...variantStyles, ...style }}
 {...props}
 />
 )
}
