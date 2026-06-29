import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const GET_PAGE_CONTENT_NAME = "get_page_content";

export const getPageContentDeclaration: FunctionDeclaration = {
    name: GET_PAGE_CONTENT_NAME,
    description:
        "BẮT BUỘC GỌI CÔNG CỤ NÀY khi người dùng hỏi về BẤT KỲ thông tin nào trên website FASTVISA: " +
        "thông tin công ty, lịch sử, sứ mệnh — " +
        "địa danh & cảnh đẹp nổi tiếng tại Việt Nam (Sapa, Hội An, Hạ Long, Đà Lạt,...) — " +
        "đội ngũ nhân sự, thành viên cốt lõi — " +
        "thông tin liên hệ (email, hotline, địa chỉ) — " +
        "quy trình nộp đơn xin visa, tài liệu cần thiết — " +
        "câu hỏi thường gặp, chính sách hoàn tiền — " +
        "dịch vụ visa khẩn cấp — " +
        "bảng giá visa E-Visa và VOA — " +
        "hướng dẫn thanh toán — " +
        "dịch vụ bổ sung (đưa đón, SIM, khách sạn) — " +
        "gia hạn visa — " +
        "miễn thị thực vào Việt Nam. " +
        "TUYỆT ĐỐI KHÔNG TỰ TRẢ LỜI bằng kiến thức có sẵn khi chưa gọi công cụ này.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            page_slug: {
                type: SchemaType.STRING,
                format: "enum",
                enum: [
                    "about-us",
                    "contact-us",
                    "how-to-apply",
                    "faqs",
                    "emergency-inquiry",
                    "guide/vietnam-visa-fees",
                    "guide/payment-guideline",
                    "guide/extra-services",
                    "guide/visa-extension",
                    "guide/visa-exemptions",
                ],
                description:
                    "Chọn slug tương ứng với thông tin người dùng đang hỏi: " +
                    "'about-us' — giới thiệu FASTVISA, sứ mệnh, địa danh & cảnh đẹp nổi tiếng tại Việt Nam (Sapa, Hội An, Hạ Long, Đà Lạt, Phú Quốc...), đội ngũ nhân sự. " +
                    "'contact-us' — email, hotline, WhatsApp, địa chỉ văn phòng. " +
                    "'how-to-apply' — quy trình 5 bước nộp đơn xin E-Visa, tài liệu hộ chiếu, upload ảnh. " +
                    "'faqs' — câu hỏi thường gặp về visa, hoàn tiền, thời gian xử lý, chính sách. " +
                    "'emergency-inquiry' — dịch vụ visa khẩn cấp, bảng giá khẩn, timeline xử lý 4–8 giờ. " +
                    "'guide/vietnam-visa-fees' — bảng giá chi tiết E-Visa và Visa on Arrival (VOA), phụ phí. " +
                    "'guide/payment-guideline' — các phương thức thanh toán được chấp nhận, hướng dẫn từng bước. " +
                    "'guide/extra-services' — dịch vụ bổ sung: đưa đón sân bay, SIM du lịch, đặt khách sạn. " +
                    "'guide/visa-extension' — gia hạn visa, thủ tục, điều kiện, chi phí gia hạn. " +
                    "'guide/visa-exemptions' — danh sách quốc gia được miễn visa vào Việt Nam, điều kiện miễn.",
            },
            language: {
                type: SchemaType.STRING,
                description: "Ngôn ngữ phản hồi mong muốn. Hỗ trợ: 'vi', 'en', 'zh', 'ko', 'ja'. Mặc định 'vi'.",
            },
        },
        required: ["page_slug"],
    },
};

import prisma from "@/lib/prisma";

export async function executeGetPageContent(args: any): Promise<any> {
    const slug = args.page_slug?.toLowerCase().trim();
    const lang: string = args.language || "vi";

    try {
        switch (slug) {
            case "about-us": {
                // Lấy đồng thời 3 nguồn: bài viết + PageSetting (destinations) + đội ngũ
                const [article, pageSetting, members] = await Promise.all([
                    prisma.article.findUnique({ where: { slug: "about-us" } }),
                    prisma.pageSetting.findUnique({ where: { key: "about-us" } }),
                    prisma.teamMember.findMany({
                        where: { isActive: true },
                        orderBy: { displayOrder: "asc" },
                    }),
                ]);

                // Trích xuất danh sách địa danh từ SceneSlider (lưu trong PageSetting JSON)
                let destinationsContent = "";
                if (pageSetting?.value) {
                    const settings = pageSetting.value as any;
                    const destinations: any[] = settings.destinations || [];
                    if (destinations.length > 0) {
                        const lines = destinations.map((d: any) => {
                            const t =
                                d.translations?.[lang] ||
                                d.translations?.["vi"] ||
                                d.translations?.["en"] ||
                                {};
                            const parts = [t.title || d.key];
                            if (t.location) parts.push(t.location);
                            if (t.desc) parts.push(t.desc);
                            return `- ${parts.join(" | ")}`;
                        });
                        destinationsContent = `\n\nĐịa danh & Cảnh đẹp nổi tiếng tại Việt Nam:\n${lines.join("\n")}`;
                    }
                }

                // Thông tin đội ngũ
                let teamContent = "";
                if (members.length > 0) {
                    const lines = members.map(
                        (m) => `- ${m.name} (${m.role})${m.description ? ": " + m.description : ""}`,
                    );
                    teamContent = `\n\nĐội ngũ cốt lõi:\n${lines.join("\n")}`;
                }

                const baseContent = article?.content || "";
                return {
                    title: article?.title || "Về chúng tôi — FASTVISA",
                    content: baseContent + destinationsContent + teamContent,
                };
            }

            case "contact-us":
            case "contact": {
                const contactSetting = await prisma.pageSetting.findUnique({ where: { key: "contact-us" } });
                if (contactSetting?.value) {
                    const c = contactSetting.value as any;
                    const lines: string[] = [];
                    if (c.email) lines.push(`Email: ${c.email}`);
                    if (c.hotline) lines.push(`Hotline / WhatsApp (24/7): ${c.hotline}`);
                    if (c.address) {
                        const addr = c.address;
                        const addrStr =
                            typeof addr === "string"
                                ? addr
                                : [addr.district, addr.city].filter(Boolean).join(", ");
                        if (addrStr) lines.push(`Địa chỉ văn phòng: ${addrStr}`);
                    }
                    if (c.working_hours) lines.push(`Giờ làm việc: ${c.working_hours}`);
                    lines.push("Trang liên hệ trực tiếp: /contact-us");
                    return { title: "Thông tin liên hệ — FASTVISA", content: lines.join("\n") };
                }
                // Fallback khi DB chưa có pageSetting contact-us
                return {
                    title: "Thông tin liên hệ — FASTVISA",
                    content: [
                        "Email: zavi@gmail.com",
                        "Hotline / WhatsApp (24/7): +84.96.5800.392",
                        "Trang liên hệ trực tiếp: /contact-us",
                    ].join("\n"),
                };
            }

            case "how-to-apply": {
                const article = await prisma.article.findUnique({ where: { slug: "how-to-apply" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Quy trình nộp đơn xin E-Visa Việt Nam",
                    content: [
                        "Bước 1: Truy cập trang /apply và điền thông tin cá nhân, thông tin hộ chiếu.",
                        "Bước 2: Chọn loại visa, cổng nhập cảnh và thời hạn lưu trú mong muốn.",
                        "Bước 3: Tải lên ảnh chụp trang thông tin hộ chiếu và ảnh chân dung.",
                        "Bước 4: Thanh toán phí dịch vụ qua các phương thức được hỗ trợ.",
                        "Bước 5: Nhận E-Visa qua email trong thời gian xử lý đã cam kết.",
                    ].join("\n"),
                };
            }

            case "faqs":
            case "faq": {
                const article = await prisma.article.findUnique({ where: { slug: "faqs" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Câu hỏi thường gặp",
                    content:
                        "Xem toàn bộ câu hỏi thường gặp tại trang /faqs. " +
                        "Bạn cũng có thể hỏi trực tiếp — tôi sẽ tra cứu câu hỏi cụ thể cho bạn.",
                };
            }

            case "emergency-inquiry":
            case "emergency": {
                const article = await prisma.article.findUnique({ where: { slug: "emergency-inquiry" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Dịch vụ Visa Khẩn cấp — FASTVISA",
                    content: [
                        "FASTVISA cung cấp dịch vụ xử lý visa khẩn cấp cho các trường hợp cần gấp.",
                        "Thời gian xử lý: 4–8 giờ làm việc tùy loại visa.",
                        "Phụ thu phí khẩn cấp áp dụng ngoài phí dịch vụ tiêu chuẩn.",
                        "Dịch vụ sửa đổi thông tin visa lỗi cũng được hỗ trợ tại trang này.",
                        "Liên hệ ngay qua WhatsApp +84.96.5800.392 để được hỗ trợ 24/7.",
                        "Chi tiết bảng giá và form yêu cầu tại: /emergency-inquiry",
                    ].join("\n"),
                };
            }

            case "guide/vietnam-visa-fees":
            case "vietnam-visa-fees": {
                const article = await prisma.article.findUnique({ where: { slug: "vietnam-visa-fees" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Bảng giá Visa Việt Nam",
                    content:
                        "Xem bảng giá chi tiết E-Visa và Visa on Arrival (VOA) tại /guide/vietnam-visa-fees. " +
                        "Bạn có thể hỏi tôi để tính phí cụ thể cho loại visa và quốc tịch của bạn.",
                };
            }

            case "guide/payment-guideline":
            case "payment-guideline": {
                const article = await prisma.article.findUnique({ where: { slug: "payment-guideline" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Hướng dẫn thanh toán",
                    content: "Xem đầy đủ các phương thức và hướng dẫn thanh toán tại /guide/payment-guideline.",
                };
            }

            case "guide/extra-services":
            case "extra-services": {
                const article = await prisma.article.findUnique({ where: { slug: "extra-services" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Dịch vụ bổ sung",
                    content:
                        "FASTVISA cung cấp các dịch vụ đi kèm: đưa đón sân bay, SIM du lịch, đặt khách sạn và nhiều hơn. " +
                        "Xem chi tiết và đăng ký tại /guide/extra-services.",
                };
            }

            case "guide/visa-extension":
            case "visa-extension": {
                const article = await prisma.article.findUnique({ where: { slug: "visa-extension" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Gia hạn Visa Việt Nam",
                    content: "Xem điều kiện, thủ tục và chi phí gia hạn visa tại /guide/visa-extension.",
                };
            }

            case "guide/visa-exemptions":
            case "visa-exemptions": {
                const article = await prisma.article.findUnique({ where: { slug: "visa-exemptions" } });
                if (article) return { title: article.title, content: article.content };
                return {
                    title: "Miễn thị thực vào Việt Nam",
                    content:
                        "Xem danh sách đầy đủ quốc gia được miễn visa khi vào Việt Nam tại /guide/visa-exemptions. " +
                        "Bạn cũng có thể hỏi tôi về quốc tịch cụ thể để kiểm tra ngay.",
                };
            }

            default:
                return {
                    error: true,
                    message:
                        `Không tìm thấy nội dung cho slug '${slug}'. ` +
                        "Slug hợp lệ: about-us, contact-us, how-to-apply, faqs, emergency-inquiry, " +
                        "guide/vietnam-visa-fees, guide/payment-guideline, guide/extra-services, " +
                        "guide/visa-extension, guide/visa-exemptions.",
                };
        }
    } catch (error: any) {
        return { error: true, message: error.message };
    }
}

import { aiToolRegistry } from "./tool-registry";

aiToolRegistry.register(GET_PAGE_CONTENT_NAME, {
    declaration: getPageContentDeclaration,
    execute: executeGetPageContent,
    category: "DATA_RETRIEVAL",
});
