import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"

import {
 createArticle,
 deleteArticle,
 fetchArticles,
 updateArticle,
 type ArticlesQuery,
} from "@/lib/api/articles.api"

export function useArticles(path: "articles" | "guidelines", query: ArticlesQuery) {
 return useQuery({
   queryKey: [path, query],
   queryFn: () => fetchArticles(path, query),
   placeholderData: keepPreviousData,
 })
}

export function useArticleMutations(path: "articles" | "guidelines") {
 const queryClient = useQueryClient()
 const invalidate = () => queryClient.invalidateQueries({ queryKey: [path] })

 return {
   update: useMutation({
     mutationFn: ({
       id,
       body,
     }: {
       id: string
       body: Parameters<typeof updateArticle>[2]
     }) => updateArticle(path, id, body),
     onSuccess: invalidate,
   }),
   create: useMutation({
     mutationFn: (body: Parameters<typeof createArticle>[1]) => createArticle(path, body),
     onSuccess: invalidate,
   }),
   remove: useMutation({
     mutationFn: (id: string) => deleteArticle(path, id),
     onSuccess: invalidate,
   }),
 }
}
