"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { PageHeader } from "@/components/layout/PageHeader"
import { AdvancedTable } from "@/components/data-table/AdvancedTable"
import type { FilterConfig } from "@/components/data-table/FilterBar"
import { StatusDropdown } from "@/components/ui/StatusDropdown"
import { fetchApplications } from "@/lib/api/applications.api"
import { useApplications } from "@/hooks/useApplications"
import { useTableState } from "@/hooks/useTableState"
import { getAdminStatusLabel } from "@/lib/application-status"
import { getVisaTypeLabel, getVisaTypeStyle } from "@/lib/visa-type"
import { t } from "@/lib/i18n"
import type { AdminApplicationListItem, VisaApplicationStatus } from "@/types/api"
import { RealtimeApplicationsSync } from "./_components/RealtimeApplicationsSync"

const STATUS_OPTIONS: VisaApplicationStatus[] = [
  "PAID",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
]

export default function ApplicationsPage() {
  const router = useRouter()
  const tableState = useTableState()
  const { query } = tableState

  // Prepare query for API based on state
  const apiQuery = {
    page: query.page ? Number(query.page) : 1,
    limit: 20,
    ...(query.status ? { status: query.status as VisaApplicationStatus } : {}),
    ...(query.visa_type ? { visa_type: query.visa_type } : {}),
    ...(query.date ? { date: query.date } : {}),
    ...(query.search ? { search: query.search } : {}),
    ...(query.sort_by
      ? {
          sort_by: query.sort_by as string,
          sort_dir: (query.sort_dir as "desc" | "asc") || "desc",
        }
      : {
          sort_by: "sequence_no",
          sort_dir: "desc" as const,
        }),
  }

  const { data, isLoading, isFetching } = useApplications(apiQuery)

  const exportQuery = useMemo(
    () => ({
      ...(query.status ? { status: query.status } : {}),
      ...(query.visa_type ? { visa_type: query.visa_type } : {}),
      ...(query.date ? { date: query.date } : {}),
      ...(query.search ? { search: query.search } : {}),
    }),
    [query.status, query.visa_type, query.date, query.search],
  )

  const exportColumns = useMemo(
    () => [
      { header: t("applications.colId"), value: (r: AdminApplicationListItem) => r.application_code ?? "—" },
      { header: t("applications.colEmail"), value: (r: AdminApplicationListItem) => r.contact_email },
      { header: t("applications.colType"), value: (r: AdminApplicationListItem) => r.visa_type },
      { header: t("applications.colCount"), value: (r: AdminApplicationListItem) => r.applicant_count },
      {
        header: t("applications.colAmount"),
        value: (r: AdminApplicationListItem) => r.total_amount.toFixed(2),
      },
      { header: t("applications.colStatus"), value: (r: AdminApplicationListItem) => r.status },
      {
        header: t("applications.colDate"),
        value: (r: AdminApplicationListItem) =>
          format(new Date(r.created_at), "dd/MM/yyyy"),
      },
    ],
    [],
  )

  const isDefaultFilter =
    (!query.page || Number(query.page) === 1) &&
    !query.search &&
    !query.status &&
    !query.visa_type &&
    !query.date &&
    (!query.sort_by || (query.sort_by === "sequence_no" && query.sort_dir !== "asc"));

  const columns = useMemo<ColumnDef<AdminApplicationListItem, unknown>[]>(
    () => [
      {
        accessorKey: "sequence_no",
        header: "STT",
        size: 70,
        enableSorting: true,
        cell: ({ row }) => row.original.sequence_no
      },
      {
        accessorKey: "application_code",
        header: t("applications.colId"),
        size: 180,
        cell: ({ row }) => row.original.application_code ?? "—",
        enableSorting: true,
      },
      {
        accessorKey: "contact_email",
        header: t("applications.colEmail"),
        enableSorting: true,
        size: 240,
        cell: ({ row }) => (
          <div className="truncate" title={row.original.contact_email}>
            {row.original.contact_email}
          </div>
        ),
      },
      {
        accessorKey: "passports",
        header: "Passport",
        size: 110,
        cell: ({ row }) => (
          <div className="whitespace-nowrap truncate max-w-[150px]" title={row.original.passports || ""}>
            {row.original.passports || "—"}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "visa_type",
        header: t("applications.colType"),
        enableSorting: true,
        size: 90,
        cell: ({ row }) => {
          const isNew = row.original.status === "PAID";
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-0.5 font-medium whitespace-nowrap"
                style={{
                  fontSize: "var(--font-size-sm)",
                  minWidth: "72px",
                  ...getVisaTypeStyle(row.original.visa_type),
                }}
              >
                {getVisaTypeLabel(row.original.visa_type)}
              </span>
              {isNew && (
                <span 
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                >
                  Mới
                </span>
              )}
            </div>
          );
        },
      },
      { accessorKey: "applicant_count", header: t("applications.colCount"), size: 100, meta: { align: "center" }, enableSorting: true },
      {
        accessorKey: "total_amount",
        header: t("applications.colAmount"),
        size: 100,
        cell: ({ row }) => <span className="tabular-nums font-medium">${row.original.total_amount.toFixed(2)}</span>,
        meta: { align: "right" },
        enableSorting: true
      },
      {
        accessorKey: "status",
        header: t("applications.colStatus"),
        meta: { align: "center" },
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (
          <StatusDropdown
            applicationId={row.original.id}
            currentStatus={row.original.status}
            readonly={true}
          />
        ),
      },
      {
        accessorKey: "created_at",
        header: t("applications.colDate"),
        meta: { align: "right" },
        size: 120,
        cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy"),
        enableSorting: true
      },
    ],
    [isDefaultFilter],
  )

  const filterConfigs: FilterConfig[] = [
    {
      key: "search",
      type: "text",
      placeholder: t("applications.searchPlaceholder"),
      width: "260px"
    },
    {
      key: "status",
      type: "select",
      placeholder: t("applications.allStatus"),
      options: STATUS_OPTIONS.map(s => ({ label: getAdminStatusLabel(s), value: s })),
      width: "190px"
    },
    {
      key: "visa_type",
      type: "select",
      placeholder: "Tất cả loại Visa",
      options: [
        { label: "E-Visa", value: "E_VISA" },
        { label: "VOA", value: "VOA" }
      ],
      width: "190px"
    },
    {
      key: "date",
      type: "date",
      placeholder: "Chọn ngày...",
      width: "190px"
    }
  ]

  return (
    <div className="flex flex-col space-y-6 pb-6 p-6">
      <RealtimeApplicationsSync />
      <PageHeader titleKey="applications.title" />

      <AdvancedTable
        columns={columns}
        data={data?.data ?? []}
        tableState={tableState}
        isLoading={isLoading || isFetching}
        emptyMessage={t("applications.empty")}
        pagination={data?.pagination}
        filterConfigs={filterConfigs}
        onRowClick={(row) => router.push(`/applications/${row.id}`)}
      />
    </div>
  )
}
