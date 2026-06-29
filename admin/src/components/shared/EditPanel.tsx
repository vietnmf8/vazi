"use client"

import { useDebouncedLoading } from "@/hooks/useDebouncedLoading"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { t } from "@/lib/i18n"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog"
import { Button } from "@/components/ui/Button"
import { SaveButton } from "@/components/shared/SaveButton"

export function EditPanel({
  title,
  children,
  onSave,
  onClose,
  onDelete,
  isEditMode,
  onTabChange,
  isSaveDisabled,
  isLoading,
  isSaving,
  className,
}: {
  title?: string
  children: React.ReactNode
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
  isEditMode?: boolean
  onTabChange?: (val: string) => void
  isSaveDisabled?: boolean
  isLoading?: boolean
  isSaving?: boolean
  className?: string
}) {
  const showLoading = useDebouncedLoading(isLoading)

  return (
    <>
      <div className={cn("hidden lg:block shrink-0", className || "lg:w-80")} />
      <aside
        className={cn("w-full shrink-0 rounded-xl p-5 flex flex-col z-40 lg:fixed lg:right-9 lg:top-[200px]", className || "lg:w-80")}
        style={{ backgroundColor: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)", height: "calc(100vh - 400px)" }}
      >
        <div className="shrink-0">
          {onTabChange !== undefined ? (
            <Tabs value={isEditMode ? "edit" : "create"} onValueChange={onTabChange} className="mb-4">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="create" className="data-[state=active]:bg-[#2563eb] data-[state=active]:text-white rounded-md transition-all">{t("master.create")}</TabsTrigger>
                <TabsTrigger value="edit" disabled={!isEditMode} className="data-[state=active]:bg-[#2563eb] data-[state=active]:text-white rounded-md transition-all">{t("master.edit")}</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <h2 className="font-medium mb-4">{title}</h2>
          )}
        </div>
        
        <fieldset disabled={isSaving} className={cn("flex flex-col gap-3 relative flex-1 pr-1 overflow-x-hidden", showLoading ? "overflow-hidden" : "overflow-y-hidden")}>
          {children}
          <div 
            className={cn(
                "absolute -inset-2 z-10 bg-white/50 flex items-center justify-center rounded-md transition-opacity duration-200 pointer-events-none",
                showLoading ? "opacity-100" : "opacity-0"
            )}
          >
            <Loader2 className="size-6 text-blue-600 animate-spin" />
          </div>
        </fieldset>

        <div className="shrink-0 flex gap-2 justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--color-border-default)" }}>
          {isEditMode && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!onDelete || isLoading || isSaving} className="mr-auto transition-all duration-200">
                  {t("common.delete") || "Xoá"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("common.confirmDeleteTitle", "Xác nhận xoá?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("common.confirmDeleteMessage", "Bạn có chắc chắn muốn xoá bản ghi này không? Hành động này không thể hoàn tác.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel", "Huỷ")}</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white border border-red-600">
                    {t("common.delete", "Xoá")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSaving}>{t("common.cancel")}</Button>
          <SaveButton onClick={onSave} disabled={isSaveDisabled || isLoading || isSaving} isLoading={isSaving} />
        </div>
      </aside>
    </>
  )
}
