import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/Input"
import { Search } from "lucide-react"
import { t } from "@/lib/i18n"

export function MasterShell({
  titleKey,
  search,
  setSearch,
  filterNode,
  children,
}: {
  titleKey: string
  search?: string
  setSearch?: (v: string) => void
  filterNode?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="p-6">
      <PageHeader titleKey={titleKey} />
      {search !== undefined && setSearch !== undefined && (
        <div className="flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto">
          <div className="relative shrink-0" style={{ width: "260px" }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none shrink-0"
              style={{ color: "var(--color-text-muted)" }}
            />
            <Input
              placeholder={t("master.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 pl-9 placeholder:text-[var(--color-text-muted)] w-full"
              style={{
                border: "1px solid var(--color-border-strong)",
                backgroundColor: "var(--color-surface-elevated)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-md)",
              }}
              aria-label={t("master.searchPlaceholder")}
            />
          </div>
          {filterNode}
        </div>
      )}
      {children}
    </div>
  )
}
