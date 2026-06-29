import { buildCompletedEmailHtml } from "./src/services/mail.service";

const testCases = ["e-visa", "voa", "fast_track", "evisa_fast_track", "voa_fast_track", "default"];

for (const templateName of testCases) {
    console.log(`\n\n--- TESTING TEMPLATE: ${templateName} ---`);
    const html = buildCompletedEmailHtml({
        customerName: "John Doe",
        code: "VN-123456",
        templateName,
        downloadUrl: "http://example.com/download.pdf",
        fileName: "E-Visa",
        pickupImageUrl: "http://example.com/pickup.jpg",
        checkUrl: "http://example.com/check"
    });
    console.log(html);
}
