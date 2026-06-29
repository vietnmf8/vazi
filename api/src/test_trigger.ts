import { runNewsletterCampaignTask } from "@/tasks/newsletter-campaign.task";

async function test() {
    console.log("Triggering Newsletter Campaign Task...");
    await runNewsletterCampaignTask();
    console.log("Task finished. Check background_jobs table.");
    process.exit(0);
}

test().catch(console.error);
