export interface ApiEnvelope<T> {
 success: boolean;
 data: T;
 error: { code: string; message: string; details?: unknown } | null;
 pagination?: PaginationMeta;
}

export interface PaginationMeta {
 current_page: number;
 per_page: number;
 total: number;
 from: number;
 to: number;
 has_more?: boolean;
}

export interface PresignedUploadParams {
 upload_endpoint: string;
 upload_params: Record<string, string | number>;
 public_id: string;
 resource_type: "image" | "raw";
 secure_url_pattern: string;
 limits: { max_bytes: number; file_type_hint: string };
 expires_at: number;
 signature_ttl_seconds: number;
}

export type PresignedUrlResponse = PresignedUploadParams;

export interface CloudinaryUploadResult {
 secure_url: string;
 public_id: string;
 version: number;
}

export interface PaginatedResponse<T> {
 data: T[];
 pagination: PaginationMeta;
}

export interface LoginRequest {
 email: string;
 password: string;
}

export interface LoginResponse {
 token: string;
 user: {
 id: string;
 email: string;
 role: string;
 };
}

export type VisaApplicationStatus =
 | "PENDING"
 | "PAID"
 | "PROCESSING"
 | "COMPLETED"
 | "REJECTED";

export type SupportTicketStatus =
 | "OPEN"
 | "IN_PROGRESS"
 | "RESOLVED"
 | "CLOSED";

export interface AdminApplicationListItem {
 id: string;
 sequence_no: number;
 application_code: string | null;
 contact_email: string;
 contact_phone: string;
 visa_type: string;
 applicant_count: number;
 total_amount: number;
 status: VisaApplicationStatus;
 created_at: string;
 passports?: string;
}

export interface AdminApplicationDetail extends AdminApplicationListItem {
 visa_category: string;
 purpose_of_visit: string;
 arrival_date: string;
 processing_time: string;
 port_of_entry: string | null;
 extra_services: Record<string, unknown> | null;
 resultDocumentPublicId?: string | null;
 result_document_download_url?: string | null;
 pickupPointImagePublicId?: string | null;
 pickup_point_image_download_url?: string | null;
 applicants: Array<{
 id: string;
 full_name: string;
 gender: string;
 nationality: string;
 date_of_birth: string;
 passport_number: string;
 passport_expiry_date: string;
 passport_image_url: string;
 portrait_image_url: string | null;
 /** URL vé máy bay hoặc thẻ lên máy bay */
 flight_ticket_url: string | null;
 }>;
 payments: Array<{
 id: string;
 transaction_id: string;
 amount: number;
 status: string;
 payment_method: string;
 created_at: string;
 }>;
}

export interface AdminApplicationAuditLogItem {
 id: string;
 action: string;
 changed_fields: Record<string, { old: unknown; new: unknown }>;
 admin_user_id: string;
 admin_email: string | null;
 created_at: string;
}

export interface AdminApplicationUpdatePayload {
 contact_email: string;
 contact_phone: string;
 visa_type: string;
 visa_category: string;
 purpose_of_visit: string;
 arrival_date: string;
 port_of_entry: string;
 processing_time: string;
 applicant_count: number;
 extra_services?: {
  vip_fast_track?: boolean;
  basic_fast_track?: boolean;
 };
 applicants: Array<{
 id?: string;
 full_name: string;
 gender: string;
 nationality: string;
 date_of_birth: string;
 passport_number: string;
 passport_expiry_date: string;
 passport_image_url: string;
 portrait_image_url?: string;
 }>;
}

export interface AdminSupportTicketListItem {
 id: string;
 full_name: string;
 email: string;
 subject: string;
 status: SupportTicketStatus;
 booking_number: string | null;
 created_at: string;
}

export interface AdminSupportTicketDetail extends AdminSupportTicketListItem {
 message: string;
 resolved_at: string | null;
}

export interface AdminDashboardStats {
 applications_pending: number;
 applications_processing: number;
 applications_completed: number;
 support_tickets_open: number;
 chat_sessions_active: number;
 recent_applications: AdminApplicationListItem[];
 recent_tickets: AdminSupportTicketListItem[];
 nationality_distribution: Array<{ nationality: string; count: number }>;
 revenue_trend: Array<{ month: string; amount: number; count: number }>;
 visa_type_distribution: Array<{ type: string; count: number }>;
 extra_services_distribution: Array<{ service: string; count: number }>;
 application_funnel: Array<{ stage: string; count: number }>;
}

export interface ChatSession {
 id: string;
 guestName: string;
 status: string;
 lastMessage?: string;
 createdAt: string;
 updatedAt?: string;
}

export interface ChatSessionsResponse {
 sessions: ChatSession[];
 total: number;
}

export interface AdminChatMessage {
 id: string;
 sender_type: string;
 message_type: string;
 text: string;
 file_url?: string;
 file_name?: string;
 images?: string[];
 documents?: Array<{ url: string; name: string }>;
 reply_to_id?: string;
 delivery_status: string;
 created_at: string;
 /** Optimistic message chưa được server xác nhận */
 isOptimistic?: boolean;
 translated_text?: string | null;
 original_language?: string | null;
}

export interface SessionMessagesResponse {
 session_id: string;
 guest_name: string;
 status: string;
 messages: AdminChatMessage[];
}

export interface PusherSendMessagePayload {
 id: string;
 session_id: string;
 message: string;
 sender: string;
 timestamp: string;
 message_type?: string;
 file_url?: string;
 file_name?: string;
 images?: string[];
 documents?: Array<{ url: string; name: string }>;
 translated_text?: string | null;
 original_language?: string | null;
}

export interface AdminSettingItem {
 key: string;
 value: unknown;
 updated_at: string;
}

export interface AdminFaqListItem {
 id: string;
 category: string;
 question: string;
 answer: string;
 display_order: number;
 is_active: boolean;
 created_at: string;
 translations?: Array<{
 language_code: string;
 question: string;
 answer: string;
 }>;
}

export interface AdminFaqDetail extends AdminFaqListItem {
 translations: Array<{
 language_code: string;
 question: string;
 answer: string;
 }>;
}

export interface AdminArticleListItem {
 id: string;
 slug: string;
 title: string;
 subtitle: string | null;
 type: string;
 category: string | null;
 image_url: string | null;
 display_order: number;
 created_at: string;
}

export interface AdminArticleDetail extends AdminArticleListItem {
 content: string;
 translations: Array<{
 language_code: string;
 title: string;
 subtitle: string | null;
 content: string;
 }>;
}

export interface AdminStepGuidelineListItem {
 id: string;
 step_number: number;
 icon: string | null;
 display_order: number;
 is_active: boolean;
 created_at: string;
}

export interface AdminStepGuidelineDetail extends AdminStepGuidelineListItem {
 translations: Array<{
 language_code: string;
 title: string;
 description: string;
 }>;
}

export interface UserProfile {
 id: string
 email: string
 fullName: string
 phone?: string
 avatarUrl?: string
 role: string
 accountStatus: string
};

export interface AdminTeamMemberListItem {
 id: string;
 name: string;
 role: string;
 description: string;
 image_url: string;
 thumb_bg: string;
 display_order: number;
 is_active: boolean;
}

export interface AdminReviewListItem {
 id: string;
 sequence_no: number;
 author_name: string;
 country_code: string;
 content: string;
 rating: number;
 avatar_url: string | null;
 is_featured: boolean;
 is_active: boolean;
 created_at: string;
}

export interface AdminCommentListItem {
 id: string;
 content: string | null;
 author_name: string;
 author_email: string;
 author_nationality: string | null;
 parent_id: string | null;
 helpful_count: number;
 created_at: string;
 reply_count: number;
 images?: string[] | null;
 original_language?: string | null;
 translated_content?: string | null;
}

export interface AdminCommentDetailItem extends AdminCommentListItem {
 replies: AdminCommentDetailItem[];
}

export interface AdminNationalityListItem {
 id: string;
 sequence_no: number;
 country_name: string;
 country_code: string;
 exemption_days: number;
 group: string;
}

export interface AdminNationalityDetail extends AdminNationalityListItem {
 translations: Array<{
 language_code: string;
 country_name: string;
 }>;
}

export interface AdminPortListItem {
 id: string;
 sequence_no: number;
 code: string;
 name: string;
 entry_type: string;
 is_active: boolean;
}

export interface AdminPricingRuleListItem {
 id: string;
 rule_type: string;
 key: string;
 price: number;
 is_active: boolean;
 name: string;
}

export interface AdminExemptionCountryListItem {
 id: string;
 sequence_no: number;
 country_code: string;
 exemption_days: number;
 display_order: number;
 is_active: boolean;
}

export interface AdminEligibilityRuleListItem {
 id: string;
 country_code: string;
 is_active: boolean;
}

export interface AdminNewsletterListItem {
 id: string;
 sequence_no: number;
 email: string;
 is_active: boolean;
 subscribed_at: string;
}

export interface AdminNewsletterCampaignListItem {
 id: string;
 sequence_no: number;
 subject: string;
 htmlContent: string;
 lastUsedAt: string | null;
 createdAt: string;
}

export interface AdminUserListItem {
 id: string;
 sequence_no: number;
 email: string;
 full_name: string;
 phone: string;
 role: string;
 created_at: string;
}
