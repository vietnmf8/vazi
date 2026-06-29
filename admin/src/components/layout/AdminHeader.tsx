"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User, Lock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { clearSession } from "@/lib/auth"
import { t } from "@/lib/i18n"
import { useAuthMe } from "@/lib/api/auth.api"
import { UpdateProfileDialog } from "@/components/features/auth/UpdateProfileDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/Skeleton"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

export function AdminHeader() {
  const router = useRouter()
  const { user, isLoading } = useAuthMe()
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false)
  const [initialProfileTab, setInitialProfileTab] = useState<"profile" | "password">("profile")

  const handleLogout = async () => {
    await clearSession()
    router.refresh()
    router.push("/login")
  }

  const getInitials = (name: string) => {
    if (!name) return "AD"
    const words = name.split(" ")
    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header
      className="flex items-center justify-between h-14 px-6 shrink-0"
      style={{
        backgroundColor: "var(--color-surface-elevated)",
        borderBottom: "1px solid var(--color-border-default)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-lm.png" alt={t("app.title")} className="h-10 w-auto object-contain" />
      </div>

      <div className="flex items-center gap-4">
        {/* User Profile */}
        {isLoading ? (
          <Skeleton className="size-8 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="size-8 rounded-full flex items-center justify-center font-bold text-sm hover:ring-2 ring-offset-2 ring-blue-500 transition-all focus:outline-none overflow-hidden"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                }}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user.fullName)
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" style={{ backgroundColor: "var(--color-surface-elevated)" }}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none" style={{ color: "var(--color-text-primary)" }}>{user.fullName}</p>
                  <p className="text-xs leading-none" style={{ color: "var(--color-text-muted)" }}>
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer gap-2" 
                style={{ color: "var(--color-text-primary)" }}
                onSelect={() => {
                  setTimeout(() => {
                    setInitialProfileTab("profile")
                    setIsUpdateProfileOpen(true)
                  }, 100)
                }}
              >
                <User size={16} />
                <span>Hồ sơ</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer gap-2"
                onSelect={() => {
                  setTimeout(() => {
                    setInitialProfileTab("password")
                    setIsUpdateProfileOpen(true)
                  }, 100)
                }}
                style={{ color: "var(--color-text-primary)" }}
              >
                <Lock size={16} />
                <span>Đổi mật khẩu</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer gap-2 hover:bg-red-50 focus:bg-red-50"
                onClick={handleLogout}
                style={{ color: "var(--color-error)" }}
              >
                <LogOut size={16} />
                <span>{t("app.logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <UpdateProfileDialog 
        open={isUpdateProfileOpen} 
        onOpenChange={setIsUpdateProfileOpen} 
        initialTab={initialProfileTab}
      />
    </header>
  )
}
