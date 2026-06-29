import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  fetchReviews,
  createReview,
  updateReview,
  deleteReview,
} from "@/lib/api/content.api"

export function useReviews(query: any) {
  return useQuery({
    queryKey: ["reviews", query],
    queryFn: () => fetchReviews(query),
      placeholderData: keepPreviousData,
  })
}

export function useReviewMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reviews"] })

  return {
    update: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: string
        body: Parameters<typeof updateReview>[1]
      }) => updateReview(id, body),
      onSuccess: invalidate,
    }),
    create: useMutation({
      mutationFn: (body: Parameters<typeof createReview>[0]) => createReview(body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteReview(id),
      onSuccess: invalidate,
    }),
  }
}
