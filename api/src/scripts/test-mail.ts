import dotenv from "dotenv";
dotenv.config({ path: "d:\\F8_K15_BTVN\\FASTVISA\\api\\.env" });

import { sendApplicationCompletedEmail } from "../services/mail.service";
import { getSignedRawDownloadUrl } from "../services/cloudinary-result-url.service";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testMail() {
    console.log("=== BẮT ĐẦU TEST GỬI MAIL ĐÍNH KÈM ===");
    const testEmail = "vietnm.oes@gmail.com";
    
    // Upload lại 1 file để test
    const pdfPath = "d:\\F8_K15_BTVN\\FASTVISA\\docs\\VietNam_eVisa_E260616NZLLT50817935.pdf";
    console.log("1. Đang upload file PDF...");
    const uploadResult = await cloudinary.uploader.upload(pdfPath, {
        resource_type: "raw",
        folder: "fastvisa/test",
    });
    console.log("-> Upload thành công public_id:", uploadResult.public_id);

    // Lấy URL đính kèm
    const downloadUrl = getSignedRawDownloadUrl(uploadResult.public_id, "JUGALBOT MARDY");
    console.log("-> Download URL:", downloadUrl);

    // Gửi mail
    console.log(`2. Đang gửi mail tới ${testEmail}...`);
    await sendApplicationCompletedEmail({
        to: testEmail,
        applicationCode: "VN-TEST-SUCCESS",
        downloadUrl,
        applicantName: "JUGALBOT MARDY",
    });
    console.log("=== HOÀN TẤT ===");
}

testMail().catch(console.error);
