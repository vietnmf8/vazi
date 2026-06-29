import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "@/lib/api/content.api"

export function useTeamMembers(query: any) {
  return useQuery({
    queryKey: ["team", query],
    queryFn: () => fetchTeamMembers(query),
      placeholderData: keepPreviousData,
  })
}

export function useTeamMemberMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["team"] })

  return {
    update: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: string
        body: Parameters<typeof updateTeamMember>[1]
      }) => updateTeamMember(id, body),
      onSuccess: invalidate,
    }),
    create: useMutation({
      mutationFn: (body: Parameters<typeof createTeamMember>[0]) => createTeamMember(body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteTeamMember(id),
      onSuccess: invalidate,
    }),
  }
}
