"use client"

import { useState } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/Button"
import { showToast } from "@/components/ui/Toast"
import { apiClient } from "@/lib/api"
import { t } from "@/lib/i18n"
import { RefreshCw, Database } from "lucide-react"

export default function AiSettingsPage() {
 const [syncing, setSyncing] = useState(false)
 const [result, setResult] = useState<{ newIntents: number } | null>(null)

 const handleSyncNLP = async () => {
 setSyncing(true)
 setResult(null)
 try {
 const res = await apiClient.post("/chat/nlp/sync")
 setResult(res.data as any)
 showToast("Đồng bộ dữ liệu NLP thành công", "success")
 } catch (err: any) {
 console.error("NLP Sync Error", err)
 showToast("Lỗi đồng bộ NLP: " + (err.response?.data?.error || err.message), "error")
 } finally {
 setSyncing(false)
 }
 }

 return (
 <div className="p-6">
 <div className="sticky top-0 z-20 pb-4 mb-2 -mt-4 pt-4" style={{ backgroundColor: "var(--color-bg)" }}>
 <PageHeader titleKey="nav.aiSettings" />
 </div>

 <div className="max-w-3xl space-y-6">
 <div 
 className="rounded-xl p-6"
 style={{ 
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)" 
 }}
 >
 <div className="flex items-start gap-4 mb-6">
 <div className="p-3 rounded-full" style={{ backgroundColor: "var(--color-accent-muted)" }}>
 <Database className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <h3 className="text-lg font-medium">Đồng bộ Dữ liệu NLP (Intent Training)</h3>
 <p className="mt-1" style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
 Tính năng này sẽ quét toàn bộ Câu hỏi thường gặp (FAQ), Bảng giá (PricingRules) và Điều kiện nhập cảnh (EligibilityRules) trong cơ sở dữ liệu. 
 <br /><br />
 Hệ thống sẽ sử dụng <strong>Gemini API</strong> để tự động sinh ra các mẫu câu giao tiếp (Training Phrases) đa ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Hàn) cho những mục chưa có. Sau đó, mô hình NlpManager sẽ được train lại tự động.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-4 border-t pt-6 mt-4" style={{ borderColor: "var(--color-border-muted)" }}>
 <Button 
 onClick={handleSyncNLP} 
 disabled={syncing}
 className="gap-2 px-6"
 style={{ backgroundColor: "#2563eb", color: "#fff", borderColor: "#2563eb" }}
 >
 <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
 {syncing ? "Đang đồng bộ..." : "Đồng bộ NLP"}
 </Button>
 
 {result !== null && (
 <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
 Đã đồng bộ thành công: {result.newIntents} intents mới.
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 )
}
