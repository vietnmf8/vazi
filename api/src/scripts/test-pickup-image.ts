import jwt from "jsonwebtoken";
import { getEnv } from "../configs/env.config";
import prisma from "../lib/prisma";

const API_URL = "http://localhost:5000/api/v1";

async function main() {
    console.log("=== BẮT ĐẦU TEST UPDATE PICKUP IMAGE ===");

    // 1. Lấy admin token
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("Không tìm thấy admin");
    const token = jwt.sign(
        { sub: admin.id, role: admin.role, email: admin.email },
        getEnv().JWT_SECRET,
        { expiresIn: "1h" }
    );
    console.log("1. Đã lấy Admin Token:", token.substring(0, 20) + "...");

    // 2. ID đơn hàng từ log: cmqz1noho00011g9sjtzjp5n4
    const appId = "cmqz1noho00011g9sjtzjp5n4";
    console.log("2. Test cập nhật cho đơn hàng ID:", appId);

    const testPublicId = "fastvisa/test/pickup_test_image_" + Date.now();

    // 3. Gọi API update
    console.log(`3. Gửi PATCH /admin/applications/${appId}/pickup-image`);
    let res = await fetch(`${API_URL}/admin/applications/${appId}/pickup-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ pickup_point_image_public_id: testPublicId })
    });
    
    let data = await res.json();
    if (res.ok && data.data.pickupPointImagePublicId === testPublicId) {
        console.log("✅ Test Passed: Cập nhật pickup image thành công");
        console.log("Response data:", data.data);
    } else {
        console.error("❌ Test Failed:", data);
        process.exit(1);
    }

    // 4. Lấy chi tiết đơn hàng
    console.log(`4. Gửi GET /admin/applications/${appId}`);
    res = await fetch(`${API_URL}/admin/applications/${appId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    data = await res.json();
    if (res.ok && data.data.pickupPointImagePublicId === testPublicId) {
        console.log("✅ Test Passed: API GET trả về pickupPointImagePublicId chính xác");
    } else {
        console.error("❌ Test Failed: API GET không trả về pickup image mong đợi:", data);
        process.exit(1);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
