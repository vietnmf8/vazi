import type { Metadata } from "next"
import { t } from "@/lib/i18n"

export const metadata: Metadata = {
 title: `${t("nav.support", "Yêu cầu hỗ trợ")} | FastVisa`,
}

export default function Layout({ children }: { children: React.ReactNode }) {
 return children
}
