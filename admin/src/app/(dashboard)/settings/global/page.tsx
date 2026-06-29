"use client"

import { SettingsEditor } from "@/components/features/settings/SettingsEditor"
import { useGlobalSettings, useUpdateGlobalSetting } from "@/hooks/useSettings"

export default function GlobalSettingsPage() {
 const { data, isLoading } = useGlobalSettings()
 const mutation = useUpdateGlobalSetting()

 return (
 <SettingsEditor
 titleKey="settings.globalTitle"
 editorKind="global"
 items={data}
 isLoading={isLoading}
 onSave={async (key, value) => {
 await mutation.mutateAsync({ key, value })
 }}
 />
 )
}
