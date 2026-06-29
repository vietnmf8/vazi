import { v2 as cloudinary } from "cloudinary";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: "d:\\F8_K15_BTVN\\FASTVISA\\api\\.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const publicId = "uploads/2026/06/8c55e299-b789-4796-a32f-76947828f586.pdf";
const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

const downloadUrl = cloudinary.url(publicId, {
    resource_type: "raw",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
});

console.log("Download URL:", downloadUrl);

https.get(downloadUrl, (res) => {
    console.log("Status Code:", res.statusCode);
    console.log("Headers:", res.headers);
    let data = '';
    res.on('data', chunk => data += chunk.length);
    res.on('end', () => console.log("Done fetching, bytes:", data));
}).on('error', (err) => {
    console.error("HTTP Error:", err.message);
});
