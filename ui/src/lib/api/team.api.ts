import { apiClient } from "@/lib/api-client"
import { cacheLife, cacheTag } from "next/cache"
import type { ApiResponse, TeamMember } from "@/types/api"

const TEAM_MEMBERS_PATH = "/api/v1/team-members"

export async function getTeamMembers(): Promise<TeamMember[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("about-us")
  const res = await apiClient.get<ApiResponse<TeamMember[]>>(TEAM_MEMBERS_PATH)
  return res.data
}
