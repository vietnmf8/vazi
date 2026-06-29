"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"

import { MasterShell } from "@/components/shared/MasterShell"
import { DataTable } from "@/components/data-table/DataTable"
import { Badge } from "@/components/ui/Badge"
import { t } from "@/lib/i18n"
import { useMasterUsers } from "@/hooks/useMasterUsers"
import { UserActionCell } from "@/components/features/master/UserActionCell"
import type { AdminUserListItem } from "@/types/api"

export function UsersPage() {
  const {
    query,
    setFilter,
    role,
    sorting,
    setSorting,
    data,
    isLoading,
    isFetching,
    myEmailState,
    isSuperAdmin
  } = useMasterUsers()

  const columns = useMemo<ColumnDef<AdminUserListItem, unknown>[]>(
    () => {
      const cols: ColumnDef<AdminUserListItem, unknown>[] = [
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
          cell: ({ row }) => row.original.email === "vietnmf8@fullstack.edu.vn" ? "Super Admin" : row.original.full_name
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
          cell: ({ row }) => {
            if (row.original.email === "vietnmf8@fullstack.edu.vn") return <Badge className="bg-purple-600">SUPER ADMIN</Badge>;
            if (row.original.role === "ADMIN") return <Badge variant="success">ADMIN</Badge>;
            return <Badge variant="default">{row.original.role}</Badge>;
          }
        },
        {
          accessorKey: "created_at",
          header: t("users.colDate"),
          enableSorting: true,
          cell: ({ row }) => format(new Date(row.original.created_at), "dd/MM/yyyy"),
        },
      ];

      if (isSuperAdmin) {
        cols.push({
          id: "actions",
          header: () => <div className="text-center w-full">{t("common.actions")}</div>,
          enableSorting: false,
          size: 80,
          cell: ({ row }) => {
            if (row.original.email === myEmailState) return null;
            if (row.original.role !== "ADMIN") return null;
            return <UserActionCell id={row.original.id} email={row.original.email} />;
          }
        });
      }
      return cols;
    },
    [myEmailState, isSuperAdmin],
  )

  return (
    <MasterShell 
      titleKey="users.title" 
      search={query.search || ""} 
      setSearch={(v) => setFilter("search", v)}
      filterNode={
        <select value={role} onChange={(e) => setFilter("role", e.target.value)} className="rounded-lg px-3 py-2 min-h-11" style={{ border: "1px solid var(--color-border-strong)", background: "transparent" }}>
          <option value="">{t("users.allRoles")}</option>
          <option value="SUPER_ADMIN">SUPER ADMIN</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      }
    >
      <p className="mb-4 text-sm text-gray-500">{t("users.readOnly")}</p>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading || isFetching} 
        emptyMessage={t("users.empty")} 
        pagination={data?.pagination} 
        onPageChange={(p) => setFilter("page", p.toString())} 
        manualSorting={true} 
        sorting={sorting} 
        onSortingChange={setSorting} 
      />
    </MasterShell>
  )
}
