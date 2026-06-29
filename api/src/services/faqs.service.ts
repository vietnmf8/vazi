import prisma from "@/lib/prisma";

export async function getFaqs(category?: string, locale: string = "en") {
    const defaultLocale = "en";
    const whereClause = {
        isActive: true,
        ...(category ? { category } : {}),
    };

    const faqs = await prisma.faq.findMany({
        where: whereClause,
        orderBy: { displayOrder: "desc" },
        include: { translations: true },
    });

    return faqs.map((f) => {
        let question = f.question;
        let answer = f.answer;
        
        try {
            if (question.startsWith('{')) {
                const parsed = JSON.parse(question);
                question = parsed[locale] || parsed[defaultLocale] || question;
            }
        } catch (e) {}

        try {
            if (answer.startsWith('{')) {
                const parsed = JSON.parse(answer);
                answer = parsed[locale] || parsed[defaultLocale] || answer;
            }
        } catch (e) {}

        const t = f.translations.find((tr) => tr.languageCode === locale);
        
        if (t) {
            return { id: f.id, category: f.category, question: t.question, answer: t.answer };
        }

        if (locale === "vi") {
            return { id: f.id, category: f.category, question, answer };
        }

        const fallback = f.translations.find((tr) => tr.languageCode === defaultLocale);
        return {
            id: f.id,
            category: f.category,
            question: fallback ? fallback.question : question,
            answer: fallback ? fallback.answer : answer,
        };
    });
}
