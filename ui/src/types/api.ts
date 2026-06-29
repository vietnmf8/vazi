/**
 * Base types cho tất cả API responses từ backend.
 * Phản ánh envelope format: { success, data, error, pagination? }
 */

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: null
  message?: string
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  from: number
  to: number
  has_more?: boolean
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: PaginationMeta
  error: null
  message?: string
}

export interface ApiError {
  success: false
  data: null
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// ─── Enums khớp backend Prisma / Zod ───────────────────────────────────────

export type VisaType = "E_VISA" | "VOA"

export type VisaCategory =
  | "30_DAYS_SINGLE"
  | "90_DAYS_SINGLE"
  | "90_DAYS_MULTIPLE"
  | "VOA_1M_SINGLE"
  | "VOA_1M_MULTIPLE"
  | "VOA_3M_SINGLE"
  | "VOA_3M_MULTIPLE"

export type ProcessingTime =
  | "NORMAL"
  | "URGENT_4D"
  | "URGENT_3D"
  | "URGENT_2D"
  | "URGENT_1D"
  | "URGENT_4H"
  | "URGENT_2H"
  | "URGENT_1H"
  | "LAST_MINUTE"
  | "WEEKEND_PROCESSING"

export type PurposeOfVisit = "TOURIST" | "BUSINESS" | "OTHER"

export type ApplicantGender = "MALE" | "FEMALE" | "OTHER"

export type ApplicationStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"

export type PortEntryType = "AIRPORT" | "BORDER_GATE"

// ─── Pricing / Master Data ───────────────────────────────────────────────────

/** Bảng giá nhóm theo loại rule — GET /api/v1/pricing */
export interface PricingRule {
  baseFees: Record<string, number>
  processingTimes: Record<string, number>
  extraServices: Record<string, number>
}

/** Quốc tịch — GET /api/v1/nationalities */
export interface Nationality {
  code: string
  name: string
  is_eligible_evisa: boolean
  exemption_days: number
}

/** Cửa nhập cảnh — GET /api/v1/ports */
export interface Port {
  code: string
  name: string
  type: PortEntryType
}

/** Miễn thị thực theo quốc gia — GET /api/v1/exemptions/:country_code */
export interface ExemptionResult {
  country_code: string
  country_name: string
  is_eligible_evisa: boolean
  exemption_days: number
  notes: string
}

// ─── Application ─────────────────────────────────────────────────────────────

export interface ExtraServices {
  vip_fast_track?: boolean
  basic_fast_track?: boolean
}

export interface CalculatePriceRequest {
  visa_type: VisaType
  visa_category: VisaCategory
  applicant_count: number
  processing_time: ProcessingTime
  extra_services: ExtraServices
}

export interface PriceBreakdownLine {
  label: string
  amount: number
  per_person: boolean
}

export interface PriceBreakdown {
  base_fee_per_person: number
  processing_surcharge_per_person: number
  extra_services_per_person: number
  subtotal_per_person: number
  applicant_count: number
  grand_total: number
  breakdown: PriceBreakdownLine[]
}

export interface ApplicantInfo {
  full_name: string
  gender: ApplicantGender
  nationality: string
  date_of_birth: string
  passport_number: string
  passport_expiry_date: string
  passport_image_url: string
  portrait_image_url?: string
  /** URL vé máy bay / thẻ lên máy bay */
  flight_ticket_url?: string
}

export interface SubmitApplicationRequest extends CalculatePriceRequest {
  contact_email: string
  contact_phone: string
  arrival_date: string
  port_of_entry: string
  purpose_of_visit: PurposeOfVisit
  applicants: ApplicantInfo[]
}

export interface SubmitApplicationResponse {
  draft_id: string
  total_amount: number
}

export interface ApplicationDetail {
  application_id: string
  application_code: string | null
  status: ApplicationStatus
  contact_email: string
  contact_phone: string
  visa_type: VisaType
  visa_category: VisaCategory
  purpose_of_visit: PurposeOfVisit
  arrival_date: string
  port_of_entry: string | null
  processing_time: ProcessingTime
  extra_services: ExtraServices
  applicant_count: number
  total_amount: number
  applicants: ApplicantInfo[]
  price_breakdown: PriceBreakdown
}

export interface ApplicationStatusResult {
  application_code: string | null
  status: ApplicationStatus
  visa_type: VisaType
  visa_category: VisaCategory
  extra_services: ExtraServices
  arrival_date: string
  applicant_count: number
  total_amount: number
  download_url: string | null
}

// ─── Support ─────────────────────────────────────────────────────────────────

export interface ContactRequest {
  full_name: string
  email: string
  subject: string
  message: string
  booking_number?: string
}

export interface ContactResponse {
  ticket_id: string
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterSubscribeResponse {
  message: "subscribed" | "already_subscribed" | "resubscribed"
}

// ─── Posts / Blog / Articles ──────────────────────────────────────────────────

export interface Article {
  id: string
  slug: string
  title: string
  subtitle: string | null
  type: string
  image_url: string | null
  metadata?: Record<string, any>
  created_at: string
  content?: string
}

export interface ArticlesQuery {
  page?: number
  limit?: number
  type?: string
  locale?: string
}

export interface ArticlesListResult {
  items: Article[]
  pagination: PaginationMeta
}

export interface PostCategory {
  slug: string
  name: string
}

export interface Post {
  slug: string
  title: string
  thumbnail_url: string | null
  category_slug: string
  category_name: string
  published_at: string
  content?: string
}

export interface PostsQuery {
  page?: number
  limit?: number
  category_slug?: string
}

export interface PostsListResult {
  items: Post[]
  pagination: PaginationMeta
}

export interface TeamMember {
  id: string
  name: string
  role: string
  description: string
  imageUrl: string
  thumbBg: string
  isActive: boolean
  displayOrder: number
}



// ─── Reviews ────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  authorName: string
  countryCode: string
  avatarUrl: string | null
  content: string
  rating: number
  isFeatured: boolean
}

// ─── FAQs ───────────────────────────────────────────────────────────────────

export type FaqCategory = "general" | "payment" | "application" | "after-apply"

export interface Faq {
  id: string
  category: string
  question: string
  answer: string
  displayOrder: number
  isActive: boolean
}

export type FaqItem = {
  id: string
  category: FaqCategory
  question: string
  answer: string
}



// ─── Uploads (Cloudinary presigned) ─────────────────────────────────────────

/** Tham số multipart Cloudinary — khớp `PresignedUploadResult` backend */
export interface PresignedUploadParams {
  upload_endpoint: string
  upload_params: Record<string, string | number>
  public_id: string
  resource_type: "image" | "raw"
  secure_url_pattern: string
  limits: { max_bytes: number; file_type_hint: string }
  expires_at: number
  signature_ttl_seconds: number
}

/** Response POST /uploads/presigned-url */
export type PresignedUrlResponse = PresignedUploadParams

/** Kết quả upload trực tiếp lên Cloudinary */
export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  version: number
}

// ─── Payments (PayPal Hosted Checkout) ───────────────────────────────────────

export interface CreatePaymentSessionRequest {
  draft_id: string
}

export interface CreatePaymentSessionResponse {
  session_url: string
  paypal_order_id: string | null
}

export interface CaptureOrderRequest {
  token: string
  /** Fallback khi PayPal không trả custom_id trên order JSON */
  draft_id?: string
}

export interface CaptureOrderResponse {
  ok: boolean
  application_code: string | null
  application_id: string | null
}

// ─── Live Chat (Soketi + Gemini) ─────────────────────────────────────────────

export type ChatSender = "USER" | "AI" | "ADMIN" | "SYSTEM"
export type ChatMessageType = "TEXT" | "FILE" | "IMAGE" | "SYSTEM"
export type ChatDeliveryStatus = "SENT" | "DELIVERED" | "SEEN"

export type ChatWidgetPhase =
  | "CLOSED"
  | "JOINING"
  | "CHATTING"
  | "HANDOFF_PENDING"
  | "HUMAN_MODE"
  | "SURVEY"

export type ChatCardType =
  | "visa_info"
  | "visa_comparison"
  | "document_checklist"
  | "warning"
  | "urgent_cta"
  | "cta_buttons"
  | "fees"
  | "navigation"
  | "fee_summary"
  | "ticket_confirmation"

export interface ChatCardData {
  type: ChatCardType
  data: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  session_id: string
  message: string
  translated_text?: string | null
  original_language?: string | null
  sender: ChatSender
  message_type?: ChatMessageType
  file_url?: string
  file_name?: string
  images?: string[]
  documents?: { url: string; name: string }[]
  reply_to_id?: string
  /** Quick-reply suggestions sau AI message */
  suggestions?: string[]
  /** Structured card từ AI response annotation */
  card?: ChatCardData
  delivery_status?: ChatDeliveryStatus
  timestamp: string
  client_id?: string
  translatedText?: string
  isTranslating?: boolean
  isStreaming?: boolean
  isRevoked?: boolean
  reactions?: Record<string, string>
}

export interface JoinChatRequest {
  session_id?: string
  user_name: string
  nationality?: string
  visa_interest?: "E_VISA" | "VOA" | "STATUS_CHECK" | "URGENT" | "OTHER"
  website_language?: string
}

export interface JoinChatResponse {
  session_id: string
  status: "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED"
  admin_name?: string | null
  messages?: ChatMessage[]
}

export interface SendChatMessageRequest {
  session_id: string
  message: string
  sender: "USER" | "ADMIN"
  message_type?: ChatMessageType
  file_url?: string
  file_name?: string
  images?: string[]
  documents?: { url: string; name: string }[]
  reply_to_id?: string
  client_id?: string
  is_streaming?: boolean
  current_url?: string
  page_content?: string
  page_context?: string
  website_language?: string
}

export interface ChatEmittedMessage {
  id: string
  session_id: string
  message: string
  translated_text?: string | null
  original_language?: string | null
  sender: ChatSender
  message_type?: ChatMessageType
  file_url?: string
  file_name?: string
  images?: string[]
  documents?: { url: string; name: string }[]
  reply_to_id?: string
  suggestions?: string[]
  delivery_status?: ChatDeliveryStatus
  timestamp: string
}

export interface SendChatMessageResponse {
  ok: true
  messages: ChatEmittedMessage[]
}

export interface ChatHandoffRequest {
  session_id: string
}

export interface ChatTranslateRequest {
  text: string
  from_lang: string
  to_lang: string
}

export interface ChatTranslateResponse {
  translated_text: string
}

export interface ChatSurveyRequest {
  session_id: string
  rating: number
  comment?: string
}

export interface ChatStatusLookupRequest {
  session_id: string
  application_id: string
  contact_email: string
}

export interface ChatStatusLookupResponse {
  ok: true
  status: string
  visa_type: string
  arrival_date?: string
}

/** Payload Soketi `send_message` */
export interface PusherSendMessagePayload {
  id: string
  session_id: string
  message: string
  sender: ChatSender
  message_type?: ChatMessageType
  file_url?: string
  file_name?: string
  images?: string[]
  documents?: { url: string; name: string }[]
  reply_to_id?: string
  suggestions?: string[]
  card?: ChatCardData
  delivery_status?: ChatDeliveryStatus
  timestamp: string
  client_id?: string
  translated_text?: string | null
  original_language?: string | null
}

/** Payload Soketi `message_ack` / `message_status_update` */
export interface PusherMessageStatusPayload {
    message_id: string;
    client_id?: string;
    status: "SENT" | "DELIVERED" | "SEEN";
}

/** Payload Soketi `message_revoked` */
export interface PusherMessageRevokedPayload {
  message_id: string
}

/** Payload Soketi `session_closed` */
export interface PusherSessionClosedPayload {
  session_id: string
}

/** Payload Soketi `admin_joined` */
export interface PusherAdminJoinedPayload {
  session_id: string
  admin_name: string
}

/** Payload Soketi `join_chat` */
export interface PusherJoinChatPayload {
  session_id: string
  user_name: string
}

/** Payload Soketi `message_reaction_updated` */
export interface PusherMessageReactionPayload {
  message_id: string
  reactions: Record<string, string>
}

// ─── Passport OCR ──────────────────────────────────────────────────────────

export type PassportFieldConfidence = "high" | "low"

export interface ExtractPassportResponse {
  fields: {
    full_name: string | null
    gender: "male" | "female" | null
    nationality_name: string | null
    date_of_birth: string | null
    passport_number: string | null
    passport_expiry_date: string | null
  }
  confidence: {
    full_name: PassportFieldConfidence
    gender: PassportFieldConfidence
    nationality: PassportFieldConfidence
    date_of_birth: PassportFieldConfidence
    passport_number: PassportFieldConfidence
    passport_expiry_date: PassportFieldConfidence
  }
}
