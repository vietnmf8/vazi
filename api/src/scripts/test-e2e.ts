import jwt from "jsonwebtoken";
import { getEnv } from "../configs/env.config";
import prisma from "../lib/prisma";
import { v2 as cloudinary } from "cloudinary";

const API_URL = "http://localhost:5000/api/v1";

async function main() {
    console.log("=== BẮT ĐẦU E2E TEST VỚI REAL PDF ===");

    // Cấu hình Cloudinary
    cloudinary.config({
        cloud_name: getEnv().CLOUDINARY_CLOUD_NAME,
        api_key: getEnv().CLOUDINARY_API_KEY,
        api_secret: getEnv().CLOUDINARY_API_SECRET,
    });
    
    // 1. Lấy admin token
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("Không tìm thấy admin");
    const token = jwt.sign(
        { sub: admin.id, role: admin.role, email: admin.email },
        getEnv().JWT_SECRET,
        { expiresIn: "1h" }
    );
    console.log("1. Đã lấy Admin Token:", token.substring(0, 20) + "...");

    // 2. Tạo mới đơn hàng để test e2e
    console.log("2. Tạo mới đơn hàng e2e...");
    let app = await prisma.visaApplication.create({
        data: {
            contactEmail: "vietnm.oes@gmail.com",
            contactPhone: "0123456789",
            visaType: "E_VISA",
            visaCategory: "30_DAYS_SINGLE",
            purposeOfVisit: "TOURIST",
            arrivalDate: new Date(),
            processingTime: "STANDARD",
            applicantCount: 1,
            totalAmount: 25,
            status: "PROCESSING",
            applicants: {
                create: {
                    fullName: "JUGALBOT MARDY E2E",
                    gender: "MALE",
                    nationality: "PH",
                    dateOfBirth: new Date("1982-05-04"),
                    passportNumber: "P8257603B",
                    passportExpiryDate: new Date("2031-11-23"),
                    passportImageUrl: "http://example.com/passport.jpg",
                    portraitImageUrl: "http://example.com/portrait.jpg"
                }
            }
        }
    });
    console.log("2. Sử dụng đơn hàng ID:", app.id);

    // 3. Test API 1: Update status to COMPLETED (should fail without PDF)
    console.log("3. Test Update Status -> COMPLETED (Kỳ vọng: Lỗi 400 vì thiếu PDF)");
    let res = await fetch(`${API_URL}/admin/applications/${app.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: "COMPLETED" })
    });
    let data = await res.json();
    if (!res.ok) {
        if (res.status === 400 && data?.error?.message === "applications.pdf_required_for_completion") {
            console.log("✅ Test Passed: API đã chặn thành công");
        } else {
            console.error("❌ Test Failed với lỗi không lường trước:", data);
        }
    } else {
        console.error("❌ Test Failed: Đáng lẽ phải báo lỗi thiếu PDF!");
    }

    // 4. Upload file PDF thật lên Cloudinary
    console.log("4. Đang upload file PDF thật lên Cloudinary...");
    const pdfPath = "d:\\F8_K15_BTVN\\FASTVISA\\docs\\VietNam_eVisa_E260616NZLLT50817935.pdf";
    const uploadResult = await cloudinary.uploader.upload(pdfPath, {
        resource_type: "raw",
        folder: "fastvisa/test",
    });
    const testPublicId = uploadResult.public_id;
    console.log("✅ Đã upload thành công, public_id:", testPublicId);

    // 5. Test API 2: Upload PDF Public ID
    console.log("5. Test Cập nhật Result Document Public ID");
    res = await fetch(`${API_URL}/admin/applications/${app.id}/result-document`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ result_document_public_id: testPublicId })
    });
    data = await res.json();
    if (res.ok && data.data.resultDocumentPublicId === testPublicId) {
        console.log("✅ Test Passed: Cập nhật Public ID thành công");
    } else {
        console.error("❌ Test Failed: Public ID không khớp", data);
    }

    // 6. Test API 3: Update status to COMPLETED (should succeed)
    console.log("6. Test Update Status -> COMPLETED (Kỳ vọng: Thành công)");
    res = await fetch(`${API_URL}/admin/applications/${app.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: "COMPLETED" })
    });
    data = await res.json();
    if (res.ok && data.data.status === "COMPLETED") {
        console.log("✅ Test Passed: Cập nhật status thành công. Hãy kiểm tra log console của server để xem có mail được gửi đi không.");
    } else {
        console.error("❌ Test Failed:", data);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
