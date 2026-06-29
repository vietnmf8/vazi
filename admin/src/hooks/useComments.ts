import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import {
  fetchComments,
  replyToComment,
  editComment,
  deleteComment,
} from "@/lib/api/content.api"

export function useComments(query: any) {
  return useQuery({
    queryKey: ["comments", query],
    queryFn: () => fetchComments(query),
      placeholderData: keepPreviousData,
  })
}

export function useCommentMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["comments"] })

  return {
    reply: useMutation({
      mutationFn: ({
        id,
        content,
        images,
      }: {
        id: string
        content?: string
        images?: string[]
      }) => replyToComment(id, content, images),
      onSuccess: invalidate,
    }),
    edit: useMutation({
      mutationFn: ({
        id,
        content,
        images,
      }: {
        id: string
        content?: string
        images?: string[]
      }) => editComment(id, content, images),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteComment(id),
      onSuccess: invalidate,
    }),
  }
}
