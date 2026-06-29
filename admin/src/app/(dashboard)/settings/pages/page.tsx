"use client"

import { SettingsEditor } from "@/components/features/settings/SettingsEditor"
import { usePageSettings, useUpdatePageSetting } from "@/hooks/useSettings"

export default function PageSettingsPage() {
 const { data, isLoading } = usePageSettings()
 const mutation = useUpdatePageSetting()

 return (
 <SettingsEditor
 titleKey="settings.pagesTitle"
 editorKind="page"
 items={data}
 isLoading={isLoading}
 onSave={async (key, value) => {
 await mutation.mutateAsync({ key, value })
 }}
 />
 )
}
