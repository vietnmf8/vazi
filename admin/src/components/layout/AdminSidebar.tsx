"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo } from "react"
import { navGroups } from "@/components/layout/nav-config"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useAuthMe } from "@/lib/api/auth.api"
import { useAdminNotifications, NotificationType } from "@/hooks/useAdminNotifications"
import { useQuery } from "@tanstack/react-query"
import { fetchUsers } from "@/lib/api/users.api"
import { fetchApplications } from "@/lib/api/applications.api"

export function AdminSidebar() {
  const pathname = usePathname()
  const { user } = useAuthMe()
  const { counts, clearCount, totalChatUnread } = useAdminNotifications()

  const { data: userRequestsData } = useQuery({
    queryKey: ["admin-users-requests", { accountStatus: "PENDING", limit: 1 }],
    queryFn: () => fetchUsers({ accountStatus: "PENDING", limit: 1, page: 1 }),
    enabled: user?.role === "SUPER_ADMIN",
  })
  const userRequestsCount = userRequestsData?.pagination?.total || 0

  const { data: applicationsData } = useQuery({
    queryKey: ["admin-applications-count", { status: "PAID", limit: 1 }],
    queryFn: () => fetchApplications({ status: "PAID", limit: 1, page: 1 }),
  })
  const newApplicationsCount = applicationsData?.pagination?.total || 0

  // Define mapping from path prefix to notification type
  const pathMap = useMemo(() => ({
    "/sessions": "session",
    "/content/comments": "comment",
    "/marketing/newsletter": "newsletter",
  } as const), [])

  // Auto clear badges when navigating
  useEffect(() => {
    for (const [path, type] of Object.entries(pathMap)) {
      if (pathname === path || pathname.startsWith(`${path}/`)) {
        // Chỉ clear khi mới navigate vào trang (không để counts trong deps)
        clearCount(type as NotificationType)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, pathMap])

  return (
    <aside
      className="flex flex-col w-64 shrink-0 overflow-y-auto"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderRight: "1px solid var(--color-border-default)",
      }}
      aria-label="Menu điều hướng"
    >
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => {
            if (!item.roles) return true
            return user?.role && item.roles.includes(user.role)
          })

          if (visibleItems.length === 0) return null

          return (
            <div key={group.labelKey} className="space-y-1">
              {visibleItems.length > 0 && (
                <p
                  className="px-3 mb-2 font-medium uppercase tracking-wide"
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {t(group.labelKey)}
                </p>
              )}
              {visibleItems.map(({ href, labelKey, icon: Icon }) => {
                let isActive = false;
                if (href === "/") {
                  isActive = pathname === "/";
                } else if (pathname === href) {
                  isActive = true;
                } else if (pathname.startsWith(`${href}/`)) {
                  // If we are at /users/requests, both /users and /users/requests would match
                  // We check if there's a more specific menu item that matches the current pathname exactly
                  const hasExactMatch = navGroups.some(g => 
                    g.items.some(i => i.href === pathname || (i.href !== href && i.href.length > href.length && pathname.startsWith(`${i.href}/`)))
                  );
                  isActive = !hasExactMatch;
                }

                // Get count for this specific href if it matches our pathMap
                const notifyType = pathMap[href as keyof typeof pathMap]
                let itemCount = notifyType ? counts[notifyType] : 0
                
                // For chat sessions, use the new totalChatUnread
                if (href === "/sessions") {
                  itemCount = totalChatUnread
                } else if (href === "/users/requests") {
                  itemCount = userRequestsCount
                } else if (href === "/applications") {
                  itemCount = newApplicationsCount
                }
                
                const showBadge = itemCount > 0

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors min-h-11",
                      isActive ? "font-medium" : "hover:opacity-80",
                    )}
                    style={{
                      fontSize: "var(--font-size-md)",
                      color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                      backgroundColor: isActive
                        ? "var(--color-primary-subtle)"
                        : "transparent",
                    }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      <Icon size={18} aria-hidden />
                      {t(labelKey)}
                    </span>
                    {showBadge && (
                      <span
                        className="min-w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1 font-medium"
                        aria-label={`${itemCount} thông báo mới`}
                      >
                        {itemCount > 9 ? "9+" : itemCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
