import * as React from "react"
import { StingerLink } from "@/components/stinger/StingerLink"
import { useLocale, useTranslations } from "next-intl"
import { ELLIPSIS_LINKS } from "./constants"
import type { NavLink } from "@/lib/api/footer.api"

export interface HeaderNavDesktopProps {
  isActive: (href: string) => boolean
  navLinkClass: (href: string) => string
  headerNav?: NavLink[]
}

/**
 * HeaderNavDesktop - Hiển thị menu điều hướng chính trên màn hình Desktop.
 * Tích hợp Dropdown mở rộng (Ellipsis Dropdown) khi nhấp vào dấu ba chấm.
 *
 * @param {HeaderNavDesktopProps} props Các thuộc tính của HeaderNavDesktop
 */
export function HeaderNavDesktop({ isActive, navLinkClass, headerNav = [] }: HeaderNavDesktopProps) {
  const tNav = useTranslations("Navigation")
  const locale = useLocale()
  const [isEllipsisOpen, setIsEllipsisOpen] = React.useState(false)
  const ellipsisRef = React.useRef<HTMLDivElement>(null)

  // Đóng ellipsis dropdown khi click bên ngoài để đảm bảo trải nghiệm tương tác tự nhiên
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ellipsisRef.current && !ellipsisRef.current.contains(e.target as Node)) {
        setIsEllipsisOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const flatLinks = headerNav.filter((link) => link.href !== "/guide")
  const guideLink = headerNav.find((link) => link.href === "/guide")

  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
      {flatLinks.map((link) => (
        <StingerLink
          key={link.href}
          href={link.href}
          className={navLinkClass(link.href)}
          aria-current={isActive(link.href) ? "page" : undefined}
        >
          {link.translations[locale] || link.translations.en}
        </StingerLink>
      ))}

      {/* Guide Dropdown */}
      {guideLink && (
        <div 
          className="relative py-2" 
          onMouseEnter={() => setIsEllipsisOpen(true)}
          onMouseLeave={() => setIsEllipsisOpen(false)}
        >
          <StingerLink
            href={guideLink.href}
            className={navLinkClass(guideLink.href)}
            aria-expanded={isEllipsisOpen}
          >
            {guideLink.translations[locale] || guideLink.translations.en}
          </StingerLink>
        {isEllipsisOpen && (
          <div
            className="absolute left-0 top-full w-56 z-999 animate-in fade-in slide-in-from-top-1 duration-150 bg-[var(--color-bg)] dark:bg-[var(--color-surface-4)] shadow-[var(--shadow-md)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {ELLIPSIS_LINKS.map((link, idx) => (
              <StingerLink
                key={idx}
                href={link.href}
                className={`block px-4 py-2.5 text-sm text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-[var(--color-surface-2)] transition-all font-medium decoration-none ${
                  idx === 0 ? "rounded-t-md" : ""
                } ${
                  idx === ELLIPSIS_LINKS.length - 1 ? "rounded-b-md" : ""
                }`}
                style={{
                  fontFamily: "var(--font-family-heading)",
                }}
                onClick={() => setIsEllipsisOpen(false)}
              >
                {tNav(link.label as any)}
              </StingerLink>
            ))}
          </div>
        )}
      </div>
      )}
    </nav>
  )
}
