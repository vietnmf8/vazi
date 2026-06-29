interface ArticleContentProps {
  children: React.ReactNode
  className?: string
}

export function ArticleContent({ children, className = "" }: ArticleContentProps) {
  return (
    <div className={`mx-auto max-w-7xl px-6 py-24 lg:px-8 flex flex-col gap-24 ${className}`}>
      {children}
    </div>
  )
}
