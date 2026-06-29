import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"

import {
 createFaq,
 deleteFaq,
 fetchFaqs,
 updateFaq,
 type FaqsQuery,
} from "@/lib/api/faqs.api"

export function useFaqs(query: FaqsQuery) {
 const result = useQuery({
 queryKey: ["faqs", query],
 queryFn: () => fetchFaqs(query),
 placeholderData: keepPreviousData,
 })
 return {
 ...result,
 isLoading: result.isLoading || result.isFetching,
 }
}

export function useFaqMutations() {
 const queryClient = useQueryClient()
 const invalidate = () => queryClient.invalidateQueries({ queryKey: ["faqs"] })

 const update = useMutation({
 mutationFn: ({
 id,
 body,
 }: {
 id: string
 body: Parameters<typeof updateFaq>[1]
 }) => updateFaq(id, body),
 onSuccess: invalidate,
 })

 const create = useMutation({
 mutationFn: createFaq,
 onSuccess: invalidate,
 })

 const remove = useMutation({
 mutationFn: deleteFaq,
 onSuccess: invalidate,
 })

 return { update, create, remove }
}
