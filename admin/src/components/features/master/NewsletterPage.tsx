"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Loader2, Star, Eye, X } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import { EditPanel } from "@/components/shared/EditPanel"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/AlertDialog"
import { TiptapEditor } from "@/components/ui/TiptapEditor"
import { SubscriberActionCell } from "@/components/features/master/SubscriberActionCell"

import { t } from "@/lib/i18n"
import { useNewsletterSubscribers, useNewsletterCampaigns } from "@/hooks/useMasterNewsletter"
import type { AdminNewsletterListItem, AdminNewsletterCampaignListItem } from "@/types/api"
import type { FilterConfig } from "@/components/data-table/AdvancedTable"

export function NewsletterPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t("newsletter.title")}</h1>
      <Tabs defaultValue="subscribers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="subscribers" className="data-[state=active]:!bg-[#d97706] data-[state=active]:!text-white">Người đăng ký (Subscribers)</TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:!bg-[#d97706] data-[state=active]:!text-white">Chiến dịch AI (Campaigns)</TabsTrigger>
        </TabsList>
        <TabsContent value="subscribers">
          <NewsletterSubscribersTab />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NewsletterSubscribersTab() {
  const { tableState, data, isLoading } = useNewsletterSubscribers()

  const columns = useMemo<ColumnDef<AdminNewsletterListItem, unknown>[]>(
    () => [
      {
        accessorKey: "sequence_no",
        header: "STT",
        size: 80,
        enableSorting: true,
      },
      { accessorKey: "email", header: t("newsletter.colEmail"), enableSorting: true },
      {
        accessorKey: "subscribed_at",
        header: t("newsletter.colDate"),
        enableSorting: true,
        sortDescFirst: true,
        cell: ({ row }) => format(new Date(row.original.subscribed_at), "dd/MM/yyyy"),
      },
      {
        id: "actions",
        header: () => <div className="text-center w-full">{t("common.actions")}</div>,
        cell: ({ row }) => (
          <SubscriberActionCell
            id={row.original.id}
            email={row.original.email}
            isActive={row.original.is_active}
          />
        ),
      },
    ],
    []
  )

  const filterConfigs: FilterConfig[] = [
    {
      key: "search",
      type: "text",
      placeholder: "Tìm kiếm email...",
      width: "260px"
    },
    {
      key: "is_active",
      type: "select",
      placeholder: "Trạng thái",
      options: [
        { label: "Hoạt động", value: "true" },
        { label: "Đã ẩn", value: "false" }
      ],
      width: "160px"
    }
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:items-center sm:justify-between">
        <div />
      </div>
      <AdvancedTable 
        columns={columns} 
        data={data?.data ?? []} 
        tableState={tableState}
        isLoading={isLoading} 
        emptyMessage={t("newsletter.empty")} 
        pagination={data?.pagination} 
        filterConfigs={filterConfigs} 
      />
    </div>
  )
}

function CampaignsTab() {
  const {
    tableState,
    data,
    isLoading,
    previewCampaign,
    setPreviewCampaign,
    selectedCampaign,
    setSelectedCampaign,
    subject,
    setSubject,
    htmlContent,
    setHtmlContent,
    generateMutation,
    deleteMutation,
    updateMutation,
    createMutation
  } = useNewsletterCampaigns()

  const getPreviewHtml = (campaign: AdminNewsletterCampaignListItem) => {
    const currentYear = new Date().getFullYear();
    const websiteUrl = "https://fastvisa.vn";
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${campaign.subject}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf8f5; margin: 0; padding: 0; color: #44403c; line-height: 1.6; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(28, 25, 23, 0.08); }
    .header { text-align: center; padding: 30px 20px; background-color: #ffffff; border-bottom: 1px solid rgba(217, 119, 6, 0.1); }
    .header img { max-width: 140px; height: auto; }
    .hero { background-color: #d97706; background-image: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; color: #ffffff; }
    .hero h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff !important; }
    .content { padding: 40px 30px; text-align: left; }
    .content h2 { font-size: 20px; color: #1c1917; margin-top: 0; margin-bottom: 20px; font-weight: 600; }
    .content p { margin: 0 0 16px 0; font-size: 15px; color: #44403c; }
    .btn-wrapper { text-align: center; margin: 35px 0 20px 0; }
    .btn { display: inline-block; padding: 14px 32px; background-color: #d97706; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 16px rgba(217, 119, 6, 0.25); transition: background-color 0.3s ease; }
    .footer { background-color: #f5f1eb; padding: 24px; text-align: center; font-size: 12px; color: #78716c; border-top: 1px solid rgba(28, 25, 23, 0.05); }
    .footer p { margin: 0 0 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${websiteUrl}" target="_blank" style="text-decoration: none;">
        <img src="https://res.cloudinary.com/dbzaqlxvc/image/upload/v1782375011/fastvisa/assets/logo-lm.png" alt="FastVisa Logo">
      </a>
    </div>
    <div class="hero">
      <h1 style="color: #ffffff !important;">${campaign.subject}</h1>
    </div>
    <div class="content">
      ${campaign.htmlContent}
      <div class="btn-wrapper">
        <a href="${websiteUrl}" class="btn" style="color: #ffffff !important; text-decoration: none !important;">Áp dụng Visa ngay</a>
      </div>
      <p style="font-size: 13px; color: #78716c; margin-top: 30px;">Bạn nhận được email này vì đã đăng ký nhận bản tin từ FASTVISA.</p>
    </div>
    <div class="footer">
      <p>&copy; ${currentYear} FASTVISA. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  const columns = useMemo<ColumnDef<AdminNewsletterCampaignListItem, unknown>[]>(
    () => [
      {
        accessorKey: "sequence_no",
        header: "STT",
        size: 80,
        enableSorting: true,
      },
      { 
        accessorKey: "subject", 
        header: "Subject (Chủ đề)", 
        enableSorting: true,
        cell: ({ row }) => <div className="truncate max-w-[200px]" title={row.original.subject}>{row.original.subject}</div>
      },
      {
        accessorKey: "createdAt",
        header: "Ngày tạo",
        enableSorting: true,
        sortDescFirst: true,
        cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm"),
      },
      {
        id: "actions",
        header: t("common.actions"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(row.original)}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewCampaign(row.original)}>
              <Eye className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("common.confirmDelete", "Xác nhận xoá?")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("common.deleteWarning", "Bạn có chắc chắn muốn xoá bản ghi này không? Hành động này không thể hoàn tác.")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-none bg-transparent hover:bg-gray-100">{t("common.cancel", "Huỷ")}</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => {
                    deleteMutation.mutate(row.original.id)
                    if (selectedCampaign?.id === row.original.id) setSelectedCampaign(null)
                  }}>
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      },
    ],
    [deleteMutation, selectedCampaign]
  )

  const isSaveDisabled = useMemo(() => {
    if (!selectedCampaign) {
      return !subject || !htmlContent
    }
    return subject === selectedCampaign.subject && htmlContent === selectedCampaign.htmlContent
  }, [selectedCampaign, subject, htmlContent])

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <AdvancedTable
          columns={columns}
          data={data?.data ?? []}
          tableState={tableState}
          isLoading={isLoading}
          emptyMessage="Không có dữ liệu."
          pagination={data?.pagination}
          filterConfigs={[
            {
              key: "search",
              type: "text",
              placeholder: "Tìm kiếm chiến dịch...",
              width: "260px"
            }
          ]}
        />
      </div>

      <EditPanel
        className="lg:w-[500px] xl:w-[600px]"
        isEditMode={!!selectedCampaign}
        onTabChange={(val) => {
          if (val === "create") {
            setSelectedCampaign(null)
          }
        }}
        onSave={() => {
          if (!selectedCampaign) {
            createMutation.mutate({ subject, htmlContent })
          } else {
            updateMutation.mutate({ id: selectedCampaign.id, body: { subject, htmlContent } })
          }
        }}
        onClose={() => setSelectedCampaign(null)}
        isSaveDisabled={isSaveDisabled}
        isSaving={updateMutation.isPending || createMutation.isPending || generateMutation.isPending}
      >
        <div className="flex-1 space-y-4 pt-2 overflow-auto">
          {!selectedCampaign && (
            <div className="flex justify-end">
              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} variant="outline" size="sm">
                {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                Tạo bài viết bằng AI
              </Button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Tiêu đề email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nội dung (HTML)</label>
            <TiptapEditor value={htmlContent} onChange={setHtmlContent} placeholder="Nhập nội dung campaign..." />
          </div>
        </div>
      </EditPanel>

      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col relative overflow-hidden" style={{ maxHeight: '90vh', minHeight: '600px', height: '80vh' }}>
            <div className="flex items-center justify-between p-3 border-b shrink-0 bg-gray-50">
              <span className="font-medium text-sm text-gray-500">Preview: {previewCampaign.subject}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewCampaign(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 bg-[#faf8f5]">
              <iframe
                className="w-full h-full border-0"
                srcDoc={getPreviewHtml(previewCampaign)}
                title="Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
