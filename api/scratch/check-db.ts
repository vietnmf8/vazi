import prisma from "../src/lib/prisma";

async function main() {
    const faqs = await prisma.faq.findMany({ where: { trainingPhrases: { not: "[]" } } });
    console.log("FAQs with trainingPhrases:", faqs.length);

    const rules = await prisma.pricingRule.findMany({ where: { trainingPhrases: { not: "[]" } } });
    console.log("PricingRules with trainingPhrases:", rules.length);

    const eligibilities = await prisma.eligibilityRule.findMany({ where: { trainingPhrases: { not: "[]" } } });
    console.log("EligibilityRules with trainingPhrases:", eligibilities.length);
}

main().catch(console.error);
