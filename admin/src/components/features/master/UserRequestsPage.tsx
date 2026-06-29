"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { MasterShell } from "@/components/shared/MasterShell"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { t } from "@/lib/i18n"
import { useMasterUserRequests } from "@/hooks/useMasterUserRequests"
import type { AdminUserListItem } from "@/types/api"

export function UserRequestsPage() {
  const {
    query,
    setFilter,
    sorting,
    setSorting,
    data,
    isLoading,
    isFetching,
    approveMutation,
    rejectMutation
  } = useMasterUserRequests()

  const columns = useMemo<ColumnDef<AdminUserListItem, unknown>[]>(
    () => [
      {
        id: "stt",
        accessorKey: "sequence_no",
        header: "STT",
        size: 60,
        enableSorting: true,
        cell: ({ row }) => <div className="text-center">{row.original.sequence_no}</div>,
      },
      { 
        accessorKey: "email", 
        header: t("users.colEmail"),
        size: 250,
        enableSorting: true,
        cell: ({ row }) => <div className="max-w-[250px] truncate" title={row.original.email}>{row.original.email}</div>
      },
      { 
        accessorKey: "full_name", 
        header: t("users.colName"),
        enableSorting: true,
      },
      { 
        accessorKey: "phone", 
        header: t("users.colPhone"),
        enableSorting: true,
        cell: ({ row }) => {
          const p = row.original.phone || "";
          if (p.length === 10) return `${p.slice(0, 4)}.${p.slice(4, 7)}.${p.slice(7)}`;
          return p;
        }
      },
      { 
        accessorKey: "role", 
        header: t("users.colRole"),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Badge variant="default">{row.original.role}</Badge>
          </div>
        )
      },
      {
        accessorKey: "created_at",
        header: t("users.colDate"),
        enableSorting: true,
        cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy HH:mm"),
      },
      {
        id: "actions",
        header: t("common.actions"),
        enableSorting: false,
        size: 150,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => approveMutation.mutate(user.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {t("users.approve")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => rejectMutation.mutate(user.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {t("users.reject")}
              </Button>
            </div>
          );
        },
      },
    ],
    [approveMutation.isPending, rejectMutation.isPending],
  )

  return (
    <MasterShell 
      titleKey="users.requestsTitle" 
      search={query.search || ""} 
      setSearch={(v) => setFilter("search", v)}
    >
      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading || isFetching} 
        emptyMessage={t("users.emptyRequests")} 
        pagination={data?.pagination} 
        onPageChange={(p) => setFilter("page", p.toString())} 
        manualSorting={true} 
        sorting={sorting} 
        onSortingChange={setSorting} 
      />
    </MasterShell>
  )
}
