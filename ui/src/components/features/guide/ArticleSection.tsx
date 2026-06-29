interface ArticleSectionProps {
  id: string
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  titleClassName?: string
}

export function ArticleSection({
  id,
  title,
  children,
  className = "",
  titleClassName = "mb-6 text-center",
}: ArticleSectionProps) {
  return (
    <section id={id} className={`scroll-mt-32 reveal-on-scroll ${className}`}>
      {title && <h2 className={`section-title ${titleClassName}`}>{title}</h2>}
      {children}
    </section>
  )
}
