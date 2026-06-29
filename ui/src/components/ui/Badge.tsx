import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-text-primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-[var(--color-text-primary)] text-[var(--color-surface-base)] hover:bg-[var(--color-text-primary)]/80 transition-all",
        secondary:   "border-transparent bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]/80 transition-all",
        destructive: "border-transparent bg-[var(--color-error)] text-[var(--color-text-primary)] hover:bg-[var(--color-error)]/80 transition-all",
        outline:     "text-[var(--color-text-primary)] border-[var(--color-border-default)]",
        success:     "border-transparent bg-[var(--color-success)] text-[var(--color-text-primary)] hover:bg-[var(--color-success)]/80 transition-all",
        warning:     "border-transparent bg-[var(--color-warning)] text-[var(--color-surface-base)] hover:bg-[var(--color-warning)]/80 transition-all",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
