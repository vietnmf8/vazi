import prisma from "@/lib/prisma";

/**
 * Fetch cấu hình quy trình nộp hồ sơ, tài liệu bắt buộc và tips từ DB.
 * Hỗ trợ đa ngôn ngữ và chuẩn hóa dữ liệu trả về cho frontend.
 * 
 * @param locale Ngôn ngữ cần lấy (en/vi/ko)
 * @returns Object chứa steps, documents và tips đã được dịch
 */
export async function getHowToApplyGuideline(locale: string) {
    const defaultLocale = "en";

    // 1. Fetch steps
    const steps = await prisma.article.findMany({
        where: { type: "GUIDELINE", category: "step" },
        orderBy: { displayOrder: "asc" },
        include: { translations: true }
    });

    const mappedSteps = steps.map((s) => {
        const t = s.translations.find((tr) => tr.languageCode === locale) || s.translations.find((tr) => tr.languageCode === defaultLocale);
        return {
            step: s.displayOrder,
            title: t ? t.title : s.title,
            description: t ? t.content : s.content,
        };
    });

    // 2. Fetch documents
    const documents = await prisma.article.findMany({
        where: { type: "GUIDELINE", category: "document" },
        orderBy: { displayOrder: "asc" },
        include: { translations: true }
    });

    const mappedDocuments = documents.map((d) => {
        const t = d.translations.find((tr) => tr.languageCode === locale) || d.translations.find((tr) => tr.languageCode === defaultLocale);
        
        // Chuẩn hóa slug để khớp với expected doc id trên frontend UI ("how-to-apply-doc-passport-copy" -> "Passport Copy")
        let docId = d.slug;
        if (d.slug.startsWith("how-to-apply-doc-")) {
            const rawId = d.slug.replace("how-to-apply-doc-", "");
            if (rawId === "passport-copy") docId = "Passport Copy";
            else if (rawId === "portrait-photo") docId = "Portrait Photo";
            else if (rawId === "application-form") docId = "Application Form";
            else docId = rawId.replace(/-/g, " ");
        }

        return {
            id: docId,
            title: t ? t.title : d.title,
            description: t ? t.content : d.content,
            imageUrl: d.imageUrl,
        };
    });

    // 3. Fetch tips/FAQs
    const faqs = await prisma.faq.findMany({
        where: { category: "how-to-apply", isActive: true },
        orderBy: { displayOrder: "asc" },
        include: { translations: true }
    });

    const mappedTips = faqs.map((f) => {
        const t = f.translations.find((tr) => tr.languageCode === locale) || f.translations.find((tr) => tr.languageCode === defaultLocale);
        return {
            question: t ? t.question : f.question,
            answer: t ? t.answer : f.answer,
        };
    });

    return {
        steps: mappedSteps,
        documents: mappedDocuments,
        tips: mappedTips,
    };
}
