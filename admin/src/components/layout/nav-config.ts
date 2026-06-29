import type { LucideIcon } from "lucide-react"
import {
 LayoutDashboard,
 FileText,
 Headphones,
 MessageSquare,
 History,
 Newspaper,
 HelpCircle,
 BookOpen,
 ListOrdered,
 Users,
 Star,
 MessageCircle,
 FileCog,
 Settings,
 Globe,
 Anchor,
 DollarSign,
 ShieldCheck,
 ClipboardCheck,
 Mail,
 UserCircle,
 UserPlus,
 Bot,
 Video,
} from "lucide-react"

export type NavItem = {
 href: string
 labelKey: string
 icon: LucideIcon
 roles?: string[]
}

export type NavGroup = {
 labelKey: string
 items: NavItem[]
}

export const navGroups: NavGroup[] = [
 {
 labelKey: "nav.overview",
 items: [{ href: "/", labelKey: "nav.overview", icon: LayoutDashboard }],
 },
 {
 labelKey: "nav.groupOperations",
 items: [{ href: "/applications", labelKey: "nav.applications", icon: FileText }],
 },
 {
 labelKey: "nav.groupSupport",
 items: [
  // { href: "/support", labelKey: "nav.support", icon: Headphones },
 { href: "/sessions", labelKey: "nav.chatLive", icon: MessageSquare },
 // { href: "/history", labelKey: "nav.chatHistory", icon: History },
],
 },
 {
 labelKey: "nav.groupContent",
 items: [
 // { href: "/content/articles", labelKey: "nav.articles", icon: Newspaper },
 // { href: "/content/faqs", labelKey: "nav.faqs", icon: HelpCircle },
 // { href: "/content/guidelines", labelKey: "nav.guidelines", icon: BookOpen },
 // { href: "/content/steps", labelKey: "nav.steps", icon: ListOrdered },
 // { href: "/content/team", labelKey: "nav.team", icon: Users },
 { href: "/content/reviews", labelKey: "nav.reviews", icon: Star },
 { href: "/content/comments", labelKey: "nav.comments", icon: MessageCircle },
 { href: "/content/reels", labelKey: "nav.reels", icon: Video },
],
 },
 {
 labelKey: "nav.groupSettings",
 items: [
 // { href: "/settings/pages", labelKey: "nav.pageSettings", icon: FileCog },
 // { href: "/settings/global", labelKey: "nav.globalSettings", icon: Settings },
 { href: "/settings/ai", labelKey: "nav.aiSettings", icon: Bot },
],
 },
 {
 labelKey: "nav.groupSystem",
 items: [
 { href: "/master/nationalities", labelKey: "nav.nationalities", icon: Globe },
 { href: "/master/ports", labelKey: "nav.ports", icon: Anchor },
 { href: "/master/pricing", labelKey: "nav.pricing", icon: DollarSign },
 { href: "/master/exemptions", labelKey: "nav.exemptions", icon: ShieldCheck },
 // { href: "/master/eligibility", labelKey: "nav.eligibility", icon: ClipboardCheck },
 { href: "/marketing/newsletter", labelKey: "nav.newsletter", icon: Mail },
 { href: "/users", labelKey: "nav.users", icon: UserCircle },
 { href: "/users/requests", labelKey: "nav.userRequests", icon: UserPlus, roles: ["SUPER_ADMIN"] },
],
 },
]
