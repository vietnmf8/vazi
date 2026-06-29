import { ArticleHero } from "./ArticleHero"
import { FloatingTOC } from "../FloatingTOC"
import type { Article } from "@/types/api"

interface ArticleLayoutProps {
  children: React.ReactNode
  article: Article
  tocSections?: { id: string; label: string }[]
}

export function ArticleLayout({ children, article, tocSections }: ArticleLayoutProps) {
  return (
    <>
      {tocSections && <FloatingTOC sections={tocSections} />}
      <ArticleHero article={article} />
      <main className="w-full">
        {children}
      </main>
    </>
  )
}
