import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-[family-name:var(--font-family-heading)] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        /* Primary — gold gradient pill, dark text */
        default: [
          "rounded-full text-[var(--color-text-inverse)] bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_50%,var(--color-primary)_100%)]",
          "hover:scale-[1.02] hover:shadow-[var(--shadow-glow-primary)] transition-all",
          "active:scale-[0.98]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-spring)]",
        ].join(" "),

        /* Secondary — ghost pill with gold border */
        secondary: [
          "rounded-full bg-transparent border border-[rgba(200,150,90,0.4)] text-[var(--color-primary)]",
          "hover:bg-[rgba(200,150,90,0.08)] hover:border-[var(--color-primary)] transition-all",
          "transition-all duration-[var(--duration-fast)]",
        ].join(" "),

        /* Outline — subtle border, surface hover */
        outline: [
          "rounded-full bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-focus)]/50 transition-all",
          "transition-all duration-[var(--duration-fast)]",
        ].join(" "),

        /* Ghost — no border, surface hover */
        ghost: [
          "rounded-full bg-transparent text-[var(--color-text-secondary)]",
          "hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text-primary)] transition-all",
          "transition-all duration-[var(--duration-fast)]",
        ].join(" "),

        /* Destructive */
        destructive: [
          "rounded-full bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.3)] text-[var(--color-error)]",
          "hover:bg-[rgba(248,113,113,0.20)] transition-all",
          "transition-all duration-[var(--duration-fast)]",
        ].join(" "),

        /* Link */
        link: "rounded-sm text-[var(--color-text-link)] underline-offset-4 hover:underline transition-all",
      },
      size: {
        sm:      "h-8 px-4 text-xs gap-1.5",
        default: "h-12 px-6 text-base gap-2",
        lg:      "h-12 px-8 text-base gap-2",
        xl:      "h-14 px-10 text-base gap-2.5",
        icon:    "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading,
  children,
  ref,
  ...props
}: ButtonProps) {
  const sharedClassName = cn(buttonVariants({ variant, size, className }))
  const isDisabled = isLoading || props.disabled

  if (asChild) {
    return (
      <Slot
        className={sharedClassName}
        ref={ref}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={sharedClassName}
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
