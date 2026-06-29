import { config } from "dotenv";
config();

const Pusher = require("pusher-js").Pusher;
import { 
    sendApplicationPaidEmail, 
    sendApplicationProcessingEmail, 
    sendApplicationCompletedEmail, 
    sendApplicationRejectedEmail 
} from "../src/services/mail.service";

async function runTest() {
    console.log("=== STARTING EMAIL & TOAST TESTS ===");
    
    // Giả lập Pusher Client (UI/Admin Simulator)
    const key = process.env.NEXT_PUBLIC_SOKETI_KEY || process.env.SOKETI_APP_KEY || "app-key";
    const pusherClient = new Pusher(key, {
        cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER || "mt1",
        wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST || "127.0.0.1",
        wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT || "6001"),
        forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
        enabledTransports: ["ws"],
    });

    const channel = pusherClient.subscribe("system-events");
        pusherClient.bind("application_status_changed", (data: any) => {
            console.log("\n[UI/ADMIN SIMULATOR] Nhận Pusher event 'application_status_changed'");
            
            if (data.status === "PAID") {
                const name = data.buyerName || "Khách hàng";
                const type = data.visaType === "VOA" ? "Visa On Arrival" : "e-Visa";
                console.log(`👉 [CLIENT UI TOAST SUCCESS] (Bottom-Left):`);
                console.log(`   👤 Avatar: https://api.dicebear.com/7.x/notionists/svg?seed=${name}`);
                console.log(`   📝 Name: ${name}`);
                console.log(`   ✨ Msg: Vừa thanh toán thành công ${type} 🎉`);
                console.log(`👉 [ADMIN UI TOAST SUCCESS] (Bottom-Left): Có đơn hàng mới: ${data.applicationCode}`);
        } else if (data.status === "COMPLETED") {
            console.log(`👉 [ADMIN UI TOAST SUCCESS] (Bottom-Left): Đơn ${data.applicationCode} -> COMPLETED`);
        } else if (data.status === "REJECTED") {
            console.log(`👉 [ADMIN UI TOAST ERROR] (Bottom-Left): Đơn ${data.applicationCode} -> REJECTED`);
        } else if (data.status === "PROCESSING") {
            console.log(`👉 [ADMIN UI TOAST INFO] (Bottom-Left): Đơn ${data.applicationCode} -> PROCESSING`);
        }
    });

    // Chờ Pusher connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testEmail = process.env.MAIL_FROM_ADDRESS || "test@example.com"; 
    const appCode = "TEST-" + Math.floor(Math.random() * 100000);
    
    console.log(`\n--- Testing PAID for ${testEmail} ---`);
    await sendApplicationPaidEmail({
        to: testEmail,
        applicationCode: appCode,
        totalAmountUsd: 110.00,
        visaType: "E_VISA",
        buyerName: "Alex"
    });
    await new Promise(resolve => setTimeout(resolve, 500)); // Chờ Toast
    
    console.log(`\n--- Testing PROCESSING for ${testEmail} ---`);
    await sendApplicationProcessingEmail({ to: testEmail, applicationCode: appCode });
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`\n--- Testing COMPLETED for ${testEmail} ---`);
    await sendApplicationCompletedEmail({ to: testEmail, applicationCode: appCode, downloadUrl: "https://example.com/download" });
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`\n--- Testing REJECTED for ${testEmail} ---`);
    await sendApplicationRejectedEmail({ to: testEmail, applicationCode: appCode });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log("\n=== ALL TESTS FINISHED ===");
    
    // Cleanup
    channel.unbind_all();
    pusherClient.disconnect();
}

runTest().catch(console.error);
