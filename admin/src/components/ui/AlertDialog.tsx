"use client"

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/lib/utils"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

function AlertDialogOverlay({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>) {
 return (
 <AlertDialogPrimitive.Overlay
 className={cn(
 "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogContent({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>) {
 return (
 <AlertDialogPortal>
 <AlertDialogOverlay />
 <AlertDialogPrimitive.Content
 className={cn(
 "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl p-6 shadow-xl",
 "data-[state=open]:animate-in data-[state=closed]:animate-out",
 "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
 "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
 className
 )}
 style={{ backgroundColor: "var(--color-surface-elevated)" }}
 {...props}
 />
 </AlertDialogPortal>
 )
}

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return <div className={cn("flex flex-col gap-2 mb-5", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return <div className={cn("flex justify-end gap-2 mt-6", className)} {...props} />
}

function AlertDialogTitle({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) {
 return (
 <AlertDialogPrimitive.Title
 className={cn("font-semibold", className)}
 style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-lg)" }}
 {...props}
 />
 )
}

function AlertDialogDescription({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) {
 return (
 <AlertDialogPrimitive.Description
 className={cn("leading-relaxed", className)}
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}
 {...props}
 />
 )
}

function AlertDialogAction({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>) {
 return (
 <AlertDialogPrimitive.Action
 className={cn(
 "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogCancel({
 className,
 ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>) {
 return (
 <AlertDialogPrimitive.Cancel
 className={cn(
 "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80",
 className
 )}
 style={{
 backgroundColor: "var(--color-surface-base)",
 color: "var(--color-text-muted)",
 border: "1px solid var(--color-border-default)",
 }}
 {...props}
 />
 )
}

export {
 AlertDialog,
 AlertDialogTrigger,
 AlertDialogContent,
 AlertDialogHeader,
 AlertDialogFooter,
 AlertDialogTitle,
 AlertDialogDescription,
 AlertDialogAction,
 AlertDialogCancel,
}
