import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext"
import { Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/Button"
import { ThemeToggler } from "animate-ui/components/buttons/theme-toggler"
import { useLocale, useTranslations } from "next-intl"
import { ELLIPSIS_LINKS, MOBILE_NAV_ID } from "./constants"
import { RegionSelectorButton } from "./RegionSelectorButton"
import type { NavLink } from "@/lib/api/footer.api"

export interface HeaderNavMobileProps {
  isMobileMenuOpen: boolean
  theme: "light" | "dark"
  mounted: boolean
  isActive: (href: string) => boolean
  toggleTheme: () => void
  selectedRegion: string
  onOpenRegionModal: () => void
  headerNav?: NavLink[]
}

/**
 * HeaderNavMobile - Hiển thị ngăn kéo điều hướng (Mobile Drawer Menu) dành cho di động.
 *
 * @param {HeaderNavMobileProps} props Các thuộc tính của HeaderNavMobile
 */
export function HeaderNavMobile({
  isMobileMenuOpen,
  theme,
  mounted,
  isActive,
  toggleTheme,
  selectedRegion,
  onOpenRegionModal,
  headerNav = [],
}: HeaderNavMobileProps) {
  const tHeader = useTranslations("Header")
  const tNav = useTranslations("Navigation")
  const locale = useLocale()
  const router = useRouter()
  const { openGate } = useEntryGate()

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openGate({
      hideFastTrack: false, // Hiện đầy đủ 3 tùy chọn cho luồng vãng lai di động
      onConfirmNew: () => {
        router.push("/apply")
      },
      onConfirmUrgent: () => {
        router.push("/emergency-inquiry")
      },
      onConfirmFastTrack: () => {
        router.push("/apply?category=evisa-code&option=basic-fasttrack&vip=false&step=2")
      }
    })
  }

  const flatLinks = headerNav.filter((link) => link.href !== "/guide")
  const guideLink = headerNav.find((link) => link.href === "/guide")

  return (
    <div
      id={MOBILE_NAV_ID}
      className={cn(
        "overflow-y-auto overflow-x-hidden select-no-scrollbar border-t border-[var(--color-border)] transition-[max-height,opacity] duration-300 md:hidden relative",
        isMobileMenuOpen ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0"
      )}
      style={{
        background: "var(--color-surface-2)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      aria-hidden={!isMobileMenuOpen}
    >
      <nav aria-label="Mobile navigation" className="mx-auto flex flex-col px-4 pt-4 sm:px-6 pb-8">
        {flatLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block py-4 text-sm font-medium tracking-wide border-b border-[var(--color-border)] transition-all duration-150 decoration-none",
              "font-[family-name:var(--font-family-heading)]",
              isActive(link.href)
                ? "text-[var(--color-primary)]"
                : "text-(--color-text-secondary) hover:text-(--color-text-primary) transition-all"
            )}
            aria-current={isActive(link.href) ? "page" : undefined}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          >
            {link.translations[locale] || link.translations.en}
          </Link>
        ))}

        {/* Submenu — Guide */}
        {guideLink && (
          <div className="border-b border-[var(--color-border)] py-3 space-y-1">
            <Link
              href={guideLink.href}
              className={cn(
                "block py-2 px-2 text-sm font-bold text-[var(--color-text-primary)] transition-all duration-150 decoration-none uppercase tracking-wider mb-2",
                "font-[family-name:var(--font-family-heading)]"
              )}
              tabIndex={isMobileMenuOpen ? 0 : -1}
            >
              {guideLink.translations[locale] || guideLink.translations.en}
            </Link>
            <div className="pl-4 border-l-2 border-[var(--color-border)] ml-2 space-y-1">
              {ELLIPSIS_LINKS.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="block py-2 px-2 text-sm text-[var(--color-text-muted)] hover:text-(--color-text-primary) transition-all decoration-none"
                  style={{
                    fontFamily: "var(--font-family-heading)",
                  }}
                  tabIndex={isMobileMenuOpen ? 0 : -1}
                >
                  {tNav(link.label as any)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/check-status"
          className={cn(
            "block py-4 text-sm font-medium tracking-wide transition-all duration-150 decoration-none border-b border-[var(--color-border)] mb-4",
            "font-[family-name:var(--font-family-heading)]",
            isActive("/check-status")
              ? "text-[var(--color-primary)]"
              : "text-(--color-text-secondary) hover:text-(--color-text-primary) transition-all"
          )}
          aria-current={isActive("/check-status") ? "page" : undefined}
          tabIndex={isMobileMenuOpen ? 0 : -1}
        >
          {tHeader("check_status")}
        </Link>

        <div className="w-full flex flex-col gap-3">
          <div className="w-full flex items-center justify-between py-3 px-5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)]">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">
              Language
            </span>
            {!mounted ? (
              <div className="h-10 w-[84px] rounded-xl bg-stone-200/80 border border-stone-300 px-3 flex items-center gap-2 select-none shrink-0">
                <div className="w-5 h-5 rounded-full bg-stone-300 shrink-0" />
                <div className="w-6 h-3 bg-stone-300 rounded" />
              </div>
            ) : (
              <RegionSelectorButton
                selectedRegion={selectedRegion}
                onClick={onOpenRegionModal}
                tabIndex={isMobileMenuOpen ? 0 : -1}
              />
            )}
          </div>

          <div className="w-full flex items-center justify-between py-3 px-5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)]">
            <span className="text-sm font-bold text-[var(--color-text-secondary)]">
              {theme === "light" ? tHeader("light_mode") : tHeader("dark_mode")}
            </span>
            {!mounted ? (
              <div className="w-14 h-8 rounded-full bg-stone-200/80 border border-stone-300 p-1 flex items-center select-none shrink-0">
                <div className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center text-stone-600 shadow-xs">
                  <Sun className="size-3 fill-current" />
                </div>
              </div>
            ) : (
              <ThemeToggler
                theme={theme}
                toggleTheme={toggleTheme}
                tabIndex={isMobileMenuOpen ? 0 : -1}
              />
            )}
          </div>

          <button
            onClick={handleApplyClick}
            className={cn(
              buttonVariants({ variant: "default" }),
              "w-full rounded-full border-0 decoration-none text-center",
              !isMobileMenuOpen && "pointer-events-none"
            )}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          >
            {tHeader("apply_now")}
          </button>
        </div>
      </nav>
    </div>
  )
}
