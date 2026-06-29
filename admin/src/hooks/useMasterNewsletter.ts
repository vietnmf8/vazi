import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { useTableState } from "@/hooks/useTableState"
import { fetchNewsletter, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, generateCampaign } from "@/lib/api/newsletter.api"
import { showToast } from "@/components/ui/Toast"
import { t } from "@/lib/i18n"
import { getPusherClient } from "@/lib/soketi"
import type { AdminNewsletterCampaignListItem } from "@/types/api"

export function useNewsletterSubscribers() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query } = tableState
  
  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.is_active ? { is_active: query.is_active === "true" } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by ? { sort: `${query.sort_dir === "desc" ? "-" : ""}${query.sort_by}` } : { sort: "-subscribed_at" }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ["newsletter", apiQuery],
    queryFn: () => fetchNewsletter(apiQuery as any),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.channel("admin-notifications") ?? pusher.subscribe("admin-notifications")
    const handler = () => {
      qc.invalidateQueries({ queryKey: ["newsletter"] })
    }
    channel.bind("newsletter_updated", handler)
    return () => {
      channel.unbind("newsletter_updated", handler)
    }
  }, [qc])

  return { tableState, data, isLoading }
}

export function useNewsletterCampaigns() {
  const qc = useQueryClient()
  const tableState = useTableState()
  const { query } = tableState
  
  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by ? { sort: `${query.sort_dir === "desc" ? "-" : ""}${query.sort_by}` } : { sort: "-created_at" }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", apiQuery],
    queryFn: () => fetchCampaigns(apiQuery as any),
    placeholderData: keepPreviousData,
  })

  const [previewCampaign, setPreviewCampaign] = useState<AdminNewsletterCampaignListItem | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<AdminNewsletterCampaignListItem | null>(null)
  
  const [subject, setSubject] = useState("")
  const [htmlContent, setHtmlContent] = useState("")

  useEffect(() => {
    if (selectedCampaign) {
      setSubject(selectedCampaign.subject)
      setHtmlContent(selectedCampaign.htmlContent)
    } else {
      setSubject("")
      setHtmlContent("")
    }
  }, [selectedCampaign])

  const generateMutation = useMutation({
    mutationFn: generateCampaign,
    onSuccess: (data: any) => {
      if (data) {
        setSubject(data.subject);
        setHtmlContent(data.htmlContent);
        showToast("Tạo nội dung AI thành công! Vui lòng chỉnh sửa và lưu lại.", "success")
      }
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      showToast(t("common.deleted"), "success")
      if (selectedCampaign && !data?.data?.find(c => c.id !== selectedCampaign.id)) {
        setSelectedCampaign(null)
      }
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: { subject: string; htmlContent: string } }) => updateCampaign(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      showToast("Cập nhật chiến dịch thành công!", "success")
      setSelectedCampaign(null)
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  const createMutation = useMutation({
    mutationFn: (vars: { subject: string; htmlContent: string }) => createCampaign(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] })
      showToast("Tạo chiến dịch mới thành công!", "success")
      setSelectedCampaign(null)
    },
    onError: () => showToast(t("common.error"), "error"),
  })

  return {
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
  }
}
