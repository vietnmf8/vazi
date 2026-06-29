import { apiClient } from "@/lib/api-client"
import type {
  ApiResponse,
  Article,
  ArticlesListResult,
  ArticlesQuery,
  PaginatedResponse,
} from "@/types/api"

const ARTICLES_PATH = "/api/v1/articles"

/**
 * Danh sách bài viết (guides, exemptions, v.v.) có phân trang.
 */
export async function getArticles(query?: ArticlesQuery): Promise<ArticlesListResult> {
  const res = await apiClient.get<PaginatedResponse<Article>>(ARTICLES_PATH, {
    params: {
      page: query?.page,
      limit: query?.limit,
      type: query?.type,
      locale: query?.locale,
    },
    next: { tags: ["articles"], revalidate: 3600 },
  })

  const data = res.data as any;
  const items = Array.isArray(data) ? data : (data?.items || []);
  
  return {
    items: items,
    pagination: res.pagination || {
      current_page: data?.page || 1,
      per_page: data?.limit || 50,
      total: data?.total || items.length,
      from: 1,
      to: data?.limit || 50,
      has_more: false
    },
  }
}

/**
 * Chi tiết bài viết theo slug.
 */
export async function getArticle(slug: string, locale?: string): Promise<Article> {
  const res = await apiClient.get<ApiResponse<Article>>(
    `${ARTICLES_PATH}/${encodeURIComponent(slug)}`,
    {
      params: { locale },
      next: { tags: ["articles"], revalidate: 3600 },
    }
  )
  return res.data
}
