import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
 "inline-flex items-center rounded-md px-2 py-0.5 font-medium",
 {
 variants: {
 variant: {
 default: "",
 success: "",
 warning: "",
 destructive: "",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 },
)

const variantStyles: Record<string, React.CSSProperties> = {
 default: {
 backgroundColor: "color-mix(in srgb, var(--color-text-primary) 10%, transparent)",
 color: "var(--color-text-muted)",
 },
 success: {
 backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
 color: "var(--color-success)",
 },
 warning: {
 backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
 color: "var(--color-warning)",
 },
 destructive: {
 backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
 color: "var(--color-error)",
 },
}

export interface BadgeProps
 extends React.HTMLAttributes<HTMLSpanElement>,
 VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant = "default", style, ...props }: BadgeProps) {
 return (
 <span
 className={cn(badgeVariants({ variant }), className)}
 style={{
 fontSize: "var(--font-size-xs)",
 ...variantStyles[variant ?? "default"],
 ...style,
 }}
 {...props}
 />
 )
}
