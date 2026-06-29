/**
 * @file types.ts
 * @description Định nghĩa các kiểu dữ liệu sử dụng trong hệ thống bình luận (Q&A).
 */

export interface Comment {
  /** ID duy nhất của bình luận hoặc phản hồi */
  id: string;
  /** Client ID dùng làm key ổn định (stable key) trong React chống remount khi id thay đổi */
  clientId?: string;
  /** ID phiên (session ID) của người sở hữu bình luận để xác định quyền sửa/xoá */
  ownerId?: string;
  /** Tên hiển thị của tác giả */
  authorName: string;
  /** Loại tác giả: guest (khách du lịch) hoặc agent (nhân viên hỗ trợ) */
  authorType: "guest" | "agent";
  /** Quốc tịch của tác giả (chỉ có ở bình luận cấp cha hoặc reply của guest) */
  nationality?: string;
  /** Mã quốc gia (ISO 2 ký tự) để hiển thị cờ, nếu không có sẽ tự parse từ nationality */
  countryCode?: string;
  /** Thời gian gửi bình luận dưới dạng chuỗi thân thiện (ví dụ "1 day ago") */
  date: string;
  /** Nội dung bình luận */
  content: string;
  /** Danh sách ảnh đính kèm (dạng Base64 hoặc URL) */
  images?: string[];
  /** Số lượng lượt bình chọn hữu ích (helpful) */
  helpfulCount: number;
  /** Đánh dấu người dùng hiện tại đã bình chọn hữu ích hay chưa */
  hasVoted?: boolean;
  /** Danh sách các câu trả lời con (Replies) lồng sâu đệ quy */
  replies?: Comment[];
  /** Tên của tác giả được tag phản hồi (để hiển thị chip tag riêng biệt, tránh dính chữ) */
  replyTo?: string;
  /** Cờ đánh dấu bình luận đang trong trạng thái chờ API (Optimistic UI) */
  isPending?: boolean;
  /** Ngôn ngữ gốc của bình luận */
  originalLanguage?: string;
  /** Nội dung đã được dịch */
  translatedContent?: string;
}
