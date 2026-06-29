import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/configs/env.config";
import { GEMINI_MODEL } from "@/configs/constants";

export async function generateCampaignContent(): Promise<string> {
    const ai = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY.trim());
    const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
Bạn là một chuyên gia tư vấn du lịch và Visa của FASTVISA. Hãy viết một đoạn HTML (chỉ trả về phần body, không cần thẻ html, head, body) để gửi Email định kỳ cho khách hàng.
Nội dung:
- Cập nhật về "Dịch vụ E-Visa khẩn".
- Các thay đổi chính sách mới nhất hoặc mẹo du lịch hữu ích.
- Bao gồm ít nhất một hình ảnh minh họa thật đẹp bằng thẻ <img>. Hãy sử dụng nguồn ảnh từ Unsplash (ví dụ: <img src="https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=600&auto=format&fit=crop" style="max-width:100%; border-radius: 8px; margin: 20px 0;">).
- Định dạng bằng các thẻ h2, p, ul, li với inline CSS đẹp mắt theo phong cách trang trọng, tối giản (sử dụng màu chữ #44403c, margin hợp lý).
- KHÔNG sử dụng Markdown formatting (\`\`\`html). Trả về mã HTML trực tiếp để có thể render ngay lập tức vào EJS.
    `;

    try {
        const response = await model.generateContent(prompt);
        let text = response.response.text();
        
        // Dọn dẹp nếu Gemini vẫn trả về markdown
        if (text.startsWith("\`\`\`html")) {
            text = text.replace(/^\`\`\`html/g, "");
        }
        if (text.startsWith("\`\`\`")) {
            text = text.replace(/^\`\`\`/g, "");
        }
        text = text.replace(/\`\`\`$/g, "");
        
        return text.trim();
    } catch (error) {
        console.error("AI Generation failed:", error);
        // Fallback content in case AI fails
        return `
            <h2 style="color: #1c1917; font-size: 20px; font-weight: 600;">Cập Nhật Dịch Vụ E-Visa Khẩn</h2>
            <p style="color: #44403c;">Hệ thống đang bảo trì dịch vụ tự động tạo bài viết. Dưới đây là thông tin mặc định về dịch vụ e-Visa khẩn.</p>
            <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop" alt="Travel" style="max-width: 100%; border-radius: 8px; margin: 20px 0;">
        `;
    }
}
