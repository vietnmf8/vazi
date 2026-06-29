import prisma from "@/lib/prisma";
import { generateCampaignContent } from "@/utils/ai-campaign";
import { extractAndUploadImage } from "@/utils/image-processor";

async function main() {
    console.log("Starting Campaign Seeding...");
    
    // Check current count
    const count = await prisma.newsletterCampaign.count();
    console.log(`Current campaigns in DB: ${count}`);
    
    const needed = 10 - count;
    if (needed <= 0) {
        console.log("Already have 10 or more campaigns. Exiting.");
        process.exit(0);
    }
    
    console.log(`Need to generate ${needed} more campaigns.`);
    
    for (let i = 0; i < needed; i++) {
        console.log(`\n--- Generating Campaign ${i + 1}/${needed} ---`);
        try {
            // Generate HTML using Gemini
            const rawHtml = await generateCampaignContent();
            
            // Extract Subject (let's parse the first <h2> or <h3> as the subject, or use a default)
            const subjectMatch = rawHtml.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
            const subject = subjectMatch && subjectMatch[1] ? subjectMatch[1].replace(/<[^>]*>?/gm, '').trim() : "Bản tin E-Visa từ FastVisa";
            
            console.log(`Subject: ${subject}`);
            
            // Process Image
            const processedHtml = await extractAndUploadImage(rawHtml);
            
            // Save to DB
            const campaign = await prisma.newsletterCampaign.create({
                data: {
                    subject: subject,
                    htmlContent: processedHtml,
                }
            });
            console.log(`Saved Campaign ID: ${campaign.id}`);
            
            // Sleep slightly to prevent rate limiting from Gemini/Unsplash
            if (i < needed - 1) {
                console.log("Waiting 3s before next generation...");
                await new Promise(res => setTimeout(res, 3000));
            }
        } catch (err) {
            console.error(`Error generating campaign ${i + 1}:`, err);
        }
    }
    
    console.log("\nFinished Seeding.");
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
