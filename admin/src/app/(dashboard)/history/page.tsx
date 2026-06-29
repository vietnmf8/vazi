"use client"

import { useSessions } from "@/hooks/useSessions"
import { SessionList } from "@/components/SessionList"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { t } from "@/lib/i18n"

export default function HistoryPage() {
 const { sessions, isLoading, error, refetch } = useSessions("CLOSED")

 return (
 <div className="p-6 space-y-4">
 <div className="flex items-center justify-between">
 <PageHeader titleKey="chat.historyTitle" />
 <Button variant="outline" size="sm" onClick={() => refetch()}>
 {t("common.retry")}
 </Button>
 </div>

 {error && (
 <p style={{ color: "var(--color-error)", fontSize: "var(--font-size-md)" }}>
 {t("common.error")}
 </p>
 )}

 <SessionList sessions={sessions} isLoading={isLoading} showJoinButton={false} />
 </div>
 )
}
