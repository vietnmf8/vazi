import 'dotenv/config'
import prisma from './src/lib/prisma'
import { randomUUID } from 'crypto'

async function main() {
  const campaigns = [
    {
      subject: "AI Marketing: Lợi ích vượt trội cho doanh nghiệp",
      htmlContent: "<h2>AI Marketing: Lợi ích vượt trội cho doanh nghiệp</h2><p>Trí tuệ nhân tạo đang thay đổi cách chúng ta tiếp thị. Khám phá các chiến lược mới giúp tối ưu hóa chi phí và tăng tỷ lệ chuyển đổi.</p><img src='https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800' alt='AI Marketing' />",
    },
    {
      subject: "Khám phá tiềm năng AI trong Automation",
      htmlContent: "<h2>Khám phá tiềm năng AI trong Automation</h2><p>Hệ thống tự động hóa được tích hợp AI giúp doanh nghiệp tiết kiệm hàng nghìn giờ làm việc mỗi tháng.</p><img src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800' alt='AI Automation' />",
    },
    {
      subject: "Tương lai của AI trong E-commerce",
      htmlContent: "<h2>Tương lai của AI trong E-commerce</h2><p>AI dự đoán hành vi mua sắm của khách hàng, giúp cá nhân hóa trải nghiệm và tăng doanh thu đột phá.</p><img src='https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=800' alt='E-commerce AI' />",
    },
    {
      subject: "AI Content Creation: Viết nội dung thông minh",
      htmlContent: "<h2>AI Content Creation: Viết nội dung thông minh</h2><p>Sử dụng AI để tạo ra hàng ngàn bài viết chuẩn SEO trong thời gian ngắn mà vẫn đảm bảo chất lượng và độ độc đáo.</p><img src='https://images.unsplash.com/photo-1655393001768-d946c98d6958?auto=format&fit=crop&q=80&w=800' alt='AI Content' />",
    },
    {
      subject: "Phân tích dữ liệu lớn với AI",
      htmlContent: "<h2>Phân tích dữ liệu lớn với AI</h2><p>Dữ liệu là mỏ vàng. Hãy để AI giúp bạn đào sâu và phân tích dữ liệu khổng lồ để đưa ra các quyết định kinh doanh chính xác nhất.</p><img src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800' alt='Data Analytics' />",
    },
    {
      subject: "AI Chatbots: Nâng tầm dịch vụ khách hàng",
      htmlContent: "<h2>AI Chatbots: Nâng tầm dịch vụ khách hàng</h2><p>Chatbot thông minh không chỉ trả lời câu hỏi mà còn thấu hiểu cảm xúc của khách hàng, hỗ trợ 24/7 không gián đoạn.</p><img src='https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800' alt='AI Chatbot' />",
    }
  ];

  for (const campaign of campaigns) {
    await prisma.newsletterCampaign.create({
      data: {
        id: randomUUID(),
        subject: campaign.subject,
        htmlContent: campaign.htmlContent,
      }
    });
  }
  
  console.log(`Seeded ${campaigns.length} AI campaigns!`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
