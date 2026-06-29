"use client"

import React, { useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import remarkGfm from "remark-gfm"

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false })
import { CheckCheck, Download, FileIcon, FileSpreadsheet, FileText } from "lucide-react"
import { cn, cleanMessageText } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { isHandoffConnectingText } from "@/lib/chat-handoff"
import type { AdminChatMessage as AdminChatMessageType } from "@/types/api"

const timeFormatter = new Intl.DateTimeFormat(undefined, {
 hour: "2-digit",
 minute: "2-digit",
})

function formatTime(iso: string): string {
 try {
 return timeFormatter.format(new Date(iso))
 } catch {
 return ""
 }
}

interface SearchMatchSpanProps {
 children: React.ReactNode
 isAdmin: boolean
}

function SearchMatchSpan({ children, isAdmin }: SearchMatchSpanProps) {
 return (
 <span className="search-match-span rounded-sm px-0.5" data-is-admin={isAdmin ? "true" : "false"}>
 {children}
 </span>
 )
}

interface FileAttachmentProps {
 url: string
 name?: string
}

function FileAttachment({ url, name }: FileAttachmentProps) {
 const checkStr = (name ?? url ?? "").toLowerCase()
 const isImage = /\.(jpe?g|png|gif|webp)$/i.test(checkStr)

 if (isImage) {
 return (
 <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={url}
 alt={name ?? "Attachment"}
 className="max-h-48 rounded-lg object-cover"
 />
 </a>
 )
 }

 const isExcel =
 checkStr.includes(".xls") ||
 checkStr.includes(".xlsx") ||
 checkStr.includes("spreadsheet")
 const isPdf = checkStr.includes(".pdf")
 const isWord =
 checkStr.includes(".doc") ||
 checkStr.includes(".docx") ||
 checkStr.includes("wordprocessing")

 let Icon = FileIcon
 if (isExcel) Icon = FileSpreadsheet
 else if (isPdf || isWord) Icon = FileText

 return (
 <a
 href={url}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full max-w-sm group"
 style={{
 border: "1px solid var(--color-border-default)",
 backgroundColor: "var(--color-surface-elevated)",
 }}
 >
 <div
 className="flex items-center justify-center size-8 rounded shrink-0"
 style={{
 backgroundColor: "color-mix(in srgb, var(--color-info) 15%, transparent)",
 color: "var(--color-info)",
 }}
 >
 <Icon className="size-4" aria-hidden />
 </div>
 <span
 className="truncate font-medium flex-1"
 style={{ color: "var(--color-text-primary)" }}
 >
 {name ?? t("chat.downloadFile")}
 </span>
 <Download
 className="size-4 shrink-0"
 style={{ color: "var(--color-text-muted)" }}
 aria-hidden
 />
 </a>
 )
}

interface ImageGridProps {
 images: string[]
 isAdmin: boolean
}

function ImageGrid({ images, isAdmin }: ImageGridProps) {
 const gridClass =
 images.length === 1
 ? "grid-cols-1"
 : images.length === 2
 ? "grid-cols-2"
 : "grid-cols-2"

 return (
 <div className={cn("grid gap-1 mt-1", gridClass, isAdmin ? "justify-end" : "justify-start")}>
 {images.map((url, idx) => (
 <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={url}
 alt={`Image ${idx + 1}`}
 className="rounded-lg object-cover max-h-48 w-full"
 />
 </a>
 ))}
 </div>
 )
}

export interface AdminChatMessageProps {
 message: AdminChatMessageType
 isGroupedWithPrev?: boolean
 isGroupedWithNext?: boolean
 searchQuery?: string
 guestName: string
 /** Admin message đã được user phản hồi — tick xanh */
 isReplied?: boolean
}

/**
 * Bubble tin nhắn admin — grouping, thời gian tuyệt đối, markdown AI, file/ảnh, search highlight.
 */
function AdminChatMessageInner({
 message,
 isGroupedWithPrev = false,
 isGroupedWithNext = false,
 searchQuery = "",
 guestName,
 isReplied,
}: AdminChatMessageProps) {
 const isAdmin = message.sender_type === "ADMIN"
 const isUser = message.sender_type === "USER" || message.sender_type === "CUSTOMER"
 const isAi = message.sender_type === "AI" || message.sender_type === "BOT"
 const isSystem = message.sender_type === "SYSTEM"

 const renderHighlightedText = useCallback(
 (text: string) => {
 if (!searchQuery.trim()) return text
 const q = searchQuery.toLowerCase()
 const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
 const regex = new RegExp(`(${escaped})`, "gi")
 const parts = text.split(regex)

 return parts.map((part, i) => {
 if (i % 2 === 1) {
 return (
 <SearchMatchSpan key={i} isAdmin={isAdmin}>
 {part}
 </SearchMatchSpan>
 )
 }
 return part
 })
 },
 [searchQuery, isAdmin],
 )

 const markdownComponents = useMemo(() => {
 const wrap =
 (Tag: "p" | "span" | "strong" | "em" | "a" | "ul" | "ol" | "li" | "h1" | "h2" | "h3" | "blockquote") =>
 ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
 const newChildren = React.Children.map(children, (child) => {
 if (typeof child === "string") return renderHighlightedText(child)
 return child
 })
 return React.createElement(Tag, { className, ...props }, newChildren)
 }

 return {
 p: wrap("p"),
 span: wrap("span"),
 strong: wrap("strong"),
 em: wrap("em"),
 a: wrap("a"),
 ul: wrap("ul"),
 ol: wrap("ol"),
 li: wrap("li"),
 h1: wrap("h1"),
 h2: wrap("h2"),
 h3: wrap("h3"),
 blockquote: wrap("blockquote"),
 }
 }, [renderHighlightedText])

 if (isSystem) {
 // Mapping admin-friendly display text cho các system message đặc biệt
 const isConnecting = !!message.text && isHandoffConnectingText(message.text)
 const displayText =
 message.text === "HANDBACK_SYSTEM_MESSAGE"
 ? "Đã chuyển lại cho Trợ lý AI Kimi."
 : isConnecting
 ? `${guestName || "Khách hàng"} đang cần bạn hỗ trợ trực tiếp`
 : (message.text ?? "")

 return (
 <div className="flex justify-center my-2 w-full">
 <span
 // Connecting message dùng màu amber nổi bật để admin chú ý và hành động ngay
 className={cn("px-3 py-1.5 rounded-full text-center font-medium", isConnecting && "animate-pulse")}
 style={{
 backgroundColor: isConnecting
 ? "rgba(245, 158, 11, 0.18)"
 : "color-mix(in srgb, var(--color-border-default) 40%, transparent)",
 color: isConnecting ? "#d97706" : "var(--color-text-tertiary)",
 fontSize: "var(--font-size-xs)",
 border: isConnecting ? "1px solid rgba(245, 158, 11, 0.35)" : undefined,
 }}
 >
 {displayText}
 </span>
 </div>
 )
 }

 const senderLabel = isAdmin
 ? t("chat.senderAdmin")
 : isAi
 ? t("chat.senderAi")
 : isUser
 ? guestName || t("chat.guest")
 : message.sender_type

 const hasImages = Boolean(message.images && message.images.length > 0)
 const hasDocs = Boolean(message.documents && message.documents.length > 0)
 const hasFile = Boolean(message.file_url)
 const cleanText = useMemo(() => cleanMessageText(message.text), [message.text])
 const cleanTranslatedText = useMemo(() => cleanMessageText(message.translated_text), [message.translated_text])
 const isImageOnly = hasImages && !cleanText && !hasDocs && !hasFile
 const isFileOnly = (hasFile || hasDocs) && !cleanText && !hasImages

 const bubbleRadius = cn(
 "rounded-xl",
 isAdmin
 ? cn(
 "rounded-br-md",
 isGroupedWithPrev && "rounded-tr-md",
 isGroupedWithNext && "rounded-br-2xl",
 )
 : cn(
 "rounded-bl-md",
 isGroupedWithPrev && "rounded-tl-md",
 isGroupedWithNext && "rounded-bl-2xl",
 ),
 )

 return (
 <div
 className={cn(
 "flex flex-col gap-0.5 w-full",
 isAdmin ? "items-end" : "items-start",
 !isGroupedWithPrev ? "mt-3" : "mt-0.5",
 )}
 >
 {!isGroupedWithPrev && (
 <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>
 {senderLabel}
 </span>
 )}

 {hasImages && !isImageOnly && (
 <ImageGrid images={message.images!} isAdmin={isAdmin} />
 )}

 {hasFile && (
 <div className={cn("w-full flex", isAdmin ? "justify-end" : "justify-start")}>
 <FileAttachment url={message.file_url!} name={message.file_name} />
 </div>
 )}

 {hasDocs && (
 <div className={cn("flex flex-col gap-1 w-full", isAdmin ? "items-end" : "items-start")}>
 {message.documents!.map((doc, idx) => (
 <FileAttachment key={idx} url={doc.url} name={doc.name} />
 ))}
 </div>
 )}

 {isImageOnly && <ImageGrid images={message.images!} isAdmin={isAdmin} />}

 {!isImageOnly && !isFileOnly && cleanText && (
 <div
 className={cn("max-w-[75%] px-3 py-2 break-words", bubbleRadius)}
 style={
 isAdmin
 ? { backgroundColor: "var(--color-info)", color: "#ffffff" }
 : isAi
 ? {
 backgroundColor:
 "color-mix(in srgb, var(--color-success) 15%, transparent)",
 color: "var(--color-text-primary)",
 border:
 "1px solid color-mix(in srgb, var(--color-success) 30%, transparent)",
 }
 : {
 backgroundColor: "var(--color-surface-elevated)",
 color: "var(--color-text-primary)",
 border: "1px solid var(--color-border-default)",
 }
 }
 >
 {isAi ? (
 <div
 className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
 style={{ fontSize: "var(--font-size-md)" }}
 >
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
 {cleanText}
 </ReactMarkdown>
 </div>
 ) : (
 <div className="flex flex-col">
 <p
 className="whitespace-pre-wrap"
 style={{ fontSize: "var(--font-size-md)" }}
 >
 {renderHighlightedText(cleanText)}
 </p>
 {isUser && cleanTranslatedText && message.original_language !== "vi" && (
 <>
   <hr className="my-2 border-[var(--color-border-default)] opacity-50" />
   <p
   className="whitespace-pre-wrap italic text-[var(--color-text-muted)]"
   style={{ fontSize: "var(--font-size-md)" }}
   >
   {renderHighlightedText(cleanTranslatedText)}
   </p>
 </>
 )}
 </div>
 )}
 </div>
 )}

 {!isGroupedWithNext && (
 <div
 className={cn(
 "flex items-center gap-1 select-none",
 isAdmin ? "pr-1 justify-end" : "pl-1 justify-start",
 )}
 >
 <span
 style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}
 >
 {formatTime(message.created_at)}
 </span>
 {isAdmin && (
 <CheckCheck
 className={cn(
 "size-3",
 isReplied ? "text-blue-400" : "text-[var(--color-text-muted)]",
 )}
 aria-label={isReplied ? "Seen" : "Delivered"}
 />
 )}
 </div>
 )}
 </div>
 )
}

export const AdminChatMessage = React.memo(
  AdminChatMessageInner,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.translated_text === next.message.translated_text &&
    prev.message.delivery_status === next.message.delivery_status &&
    prev.message.file_url === next.message.file_url &&
    prev.isGroupedWithPrev === next.isGroupedWithPrev &&
    prev.isGroupedWithNext === next.isGroupedWithNext &&
    prev.searchQuery === next.searchQuery &&
    prev.guestName === next.guestName &&
    prev.isReplied === next.isReplied
)
