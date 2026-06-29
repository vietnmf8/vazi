import { apiClient } from "@/lib/api"
import type { AdminArticleDetail, AdminArticleListItem, PaginatedResponse } from "@/types/api"

export type ArticlesQuery = {
 page?: number
 limit?: number
 search?: string
 type?: string
 category?: string
}

export async function fetchArticles(
 path: "articles" | "guidelines",
 query: ArticlesQuery,
): Promise<PaginatedResponse<AdminArticleListItem>> {
 const params =
 path === "articles"
 ? { ...query, type: query.type ?? "guide" }
 : query

 const { data } = await apiClient.get<PaginatedResponse<AdminArticleListItem>>(
 `/admin/${path}`,
 { params },
 )
 return data
}

export async function fetchArticleDetail(
 path: "articles" | "guidelines",
 id: string,
): Promise<AdminArticleDetail> {
 const { data } = await apiClient.get<AdminArticleDetail>(`/admin/${path}/${id}`)
 return data
}

type ArticleWriteBody = {
 slug?: string
 title?: string
 subtitle?: string
 content?: string
 type?: string
 category?: string
 image_url?: string
 display_order?: number
 translations?: Array<{
 language_code: string
 title: string
 subtitle?: string
 content: string
 }>
}

export async function updateArticle(
 path: "articles" | "guidelines",
 id: string,
 body: ArticleWriteBody,
): Promise<AdminArticleDetail> {
 const { data } = await apiClient.put<AdminArticleDetail>(`/admin/${path}/${id}`, body)
 return data
}

export async function createArticle(
 path: "articles" | "guidelines",
 body: ArticleWriteBody & {
 slug: string
 title: string
 content: string
 type: string
 },
): Promise<AdminArticleDetail> {
 const { data } = await apiClient.post<AdminArticleDetail>(`/admin/${path}`, body)
 return data
}

export async function deleteArticle(path: "articles" | "guidelines", id: string): Promise<void> {
 await apiClient.delete(`/admin/${path}/${id}`)
}
