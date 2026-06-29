import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/configs/env.config";
import { GEMINI_MODEL } from "@/configs/constants";

/**
 * Dịch nội dung HTML/text sang ngôn ngữ đích sử dụng Gemini.
 * @param content Nội dung cần dịch (Tiếng Việt)
 * @param targetLanguageCode Mã ngôn ngữ đích ("en" hoặc "ko")
 * @returns Nội dung đã được dịch, giữ nguyên định dạng HTML
 */
export async function autoTranslateContent(content: string, targetLanguageCode: string): Promise<string> {
    if (!content.trim()) return "";
    
    const targetLangName = targetLanguageCode === "en" ? "English" : targetLanguageCode === "ko" ? "Korean" : targetLanguageCode;
    
    const apiKey = getEnv().GEMINI_API_KEY?.trim();
    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not configured, skipping auto-translation.");
        return content;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a professional translator. 
Translate the following Vietnamese content into ${targetLangName}. 
CRITICAL RULE: The content may contain HTML tags (like <p>, <ul>, <li>, <strong>, etc.). 
You MUST preserve all HTML tags EXACTLY as they are. ONLY translate the text inside the tags. 
DO NOT add any markdown formatting like \`\`\`html or \`\`\` in your response. 
Just return the raw translated string.

Content to translate:
${content}`;

    try {
        const result = await model.generateContent(prompt);
        let translated = result.response.text().trim();
        
        // Remove markdown formatting if Gemini includes it
        translated = translated.replace(/^```(?:html|json)?\n?/, "").replace(/\n?```$/, "").trim();
        return translated;
    } catch (error) {
        console.error("Auto translation failed", { targetLanguageCode, error });
        return content;
    }
}
