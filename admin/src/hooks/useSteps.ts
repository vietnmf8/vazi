import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  fetchStepGuidelines,
  createStepGuideline,
  updateStepGuideline,
  deleteStepGuideline,
} from "@/lib/api/content.api"

export function useSteps(query: any) {
  return useQuery({
    queryKey: ["steps", query],
    queryFn: () => fetchStepGuidelines(query),
      placeholderData: keepPreviousData,
  })
}

export function useStepMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["steps"] })

  return {
    update: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: string
        body: Parameters<typeof updateStepGuideline>[1]
      }) => updateStepGuideline(id, body),
      onSuccess: invalidate,
    }),
    create: useMutation({
      mutationFn: (body: Parameters<typeof createStepGuideline>[0]) => createStepGuideline(body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteStepGuideline(id),
      onSuccess: invalidate,
    }),
  }
}
