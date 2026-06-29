import * as React from "react"
import { cn } from "@/lib/utils"

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label'
  as?: React.ElementType
  ref?: React.Ref<HTMLElement>
}

function Typography({ className, variant = 'body', as, children, ref, ...props }: TypographyProps) {
  const Component = as || (
    variant === 'h1'      ? 'h1'    :
    variant === 'h2'      ? 'h2'    :
    variant === 'h3'      ? 'h3'    :
    variant === 'h4'      ? 'h4'    :
    variant === 'label'   ? 'label' :
    variant === 'caption' ? 'span'  : 'p'
  )

  const baseStyles = "text-[var(--color-text-primary)] font-body"

  const variantStyles = {
    h1:      "text-3xl lg:text-4xl font-bold tracking-tight",
    h2:      "section-title",
    h3:      "section-subtitle",
    h4:      "text-lg lg:text-xl font-bold tracking-tight",
    body:    "body-text",
    caption: "caption-text",
    label:   "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  }

  return (
    <Component
      ref={ref as React.Ref<HTMLElement>}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export { Typography }
