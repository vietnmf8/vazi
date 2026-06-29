/**
 * @file index.ts
 * @description Định nghĩa các hằng số kỹ thuật dùng chung cho toàn bộ ứng dụng UI.
 */

/**
 * Key lưu trữ trong sessionStorage để đánh dấu người dùng đã nhìn thấy Entry Gate Modal.
 * Tránh việc modal hiển thị lặp đi lặp lại gây phiền phức và ảnh hưởng xấu đến UX khi chuyển trang.
 */
export const EVISA_GATE_SESSION_KEY = "evisa-gate-seen";

/**
 * Thời gian chờ (ms) trước khi gửi yêu cầu tính giá vé đến máy chủ sau khi người dùng thay đổi form.
 * Giúp giảm tải cho hệ thống API (Rate Limit) và giảm số lượng request dư thừa khi người dùng nhập liệu liên tục.
 */
export const PRICE_DEBOUNCE_MS = 300;

export const WHATSAPP_URL = "https://wa.me/84965800392";

