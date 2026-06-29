import { useEffect, useState } from "react"
import type { AdminChatMessage } from "@/types/api"

/**
 * Hook tìm kiếm tin nhắn trong phiên chat admin.
 * Đồng bộ highlight DOM qua class `.search-match-span`.
 */
export function useChatSearch(messages: AdminChatMessage[]) {
 const [searchQuery, setSearchQuery] = useState("")
 const [showSearch, setShowSearch] = useState(false)
 const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
 const [scrollBehavior, setScrollBehavior] = useState<"smooth" | "auto">("smooth")
 const [totalMatches, setTotalMatches] = useState(0)

 useEffect(() => {
 if (!searchQuery) {
 setTotalMatches(0)
 return
 }

 const timer = setTimeout(() => {
 const rawElements = Array.from(
 document.querySelectorAll(".search-match-span"),
 ) as HTMLElement[]

 const elements = rawElements.sort(
 (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
 )

 setTotalMatches(elements.length)

 elements.forEach((el, idx) => {
 const isAdmin = el.getAttribute("data-is-admin") === "true"

 if (idx === currentMatchIndex) {
 el.style.backgroundColor = isAdmin ? "white" : "#fde047"
 el.style.color = isAdmin ? "black" : "#1e293b"
 el.classList.add("z-10", "relative", "font-medium")

 const container =
 el.closest('[role="log"]') ?? el.closest(".overflow-y-auto")
 if (container) {
 const elRect = el.getBoundingClientRect()
 const containerRect = container.getBoundingClientRect()
 const currentScroll = container.scrollTop
 const topLimit = containerRect.top + 60
 const bottomLimit = containerRect.bottom - 10
 const isVisible =
 elRect.top >= topLimit && elRect.bottom <= bottomLimit

 if (!isVisible) {
 const absoluteElTop =
 currentScroll + (elRect.top - containerRect.top)
 const targetScroll =
 absoluteElTop - containerRect.height / 2 + 30

 container.scrollTo({
 top: targetScroll,
 behavior: scrollBehavior,
 })
 }
 }
 } else {
 el.style.backgroundColor = "transparent"
 el.style.color = "inherit"
 el.classList.remove("z-10", "relative", "font-medium")
 }
 })
 }, 50)

 return () => clearTimeout(timer)
 }, [searchQuery, messages, currentMatchIndex, scrollBehavior])

 useEffect(() => {
 if (totalMatches > 0) {
 setCurrentMatchIndex(0)
 } else {
 setCurrentMatchIndex(-1)
 }
 }, [searchQuery, totalMatches])

 const handleNextMatch = (smooth = true) => {
 if (totalMatches === 0) return
 setScrollBehavior(smooth ? "smooth" : "auto")
 setCurrentMatchIndex((prev) => (prev + 1) % totalMatches)
 }

 const handlePrevMatch = (smooth = true) => {
 if (totalMatches === 0) return
 setScrollBehavior(smooth ? "smooth" : "auto")
 setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches)
 }

 const handleCloseSearch = () => {
 setShowSearch(false)
 setSearchQuery("")
 setCurrentMatchIndex(-1)
 }

 return {
 searchQuery,
 setSearchQuery,
 showSearch,
 setShowSearch,
 currentMatchIndex,
 totalMatches,
 handleNextMatch,
 handlePrevMatch,
 handleCloseSearch,
 }
}
