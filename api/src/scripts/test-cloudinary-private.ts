import { v2 as cloudinary } from "cloudinary";
import https from "https";
import dotenv from "dotenv";

dotenv.config({ path: "d:\\F8_K15_BTVN\\FASTVISA\\api\\.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
    const pdfPath = "d:\\F8_K15_BTVN\\FASTVISA\\docs\\VietNam_eVisa_E260616NZLLT50817935.pdf";
    console.log("Uploading as private...");
    const res = await cloudinary.uploader.upload(pdfPath, { resource_type: "image" });
    console.log("Upload result:", res.public_id);

    const publicId = "fastvisa/test/yptb3cyrzkn4wx30iz0f.pdf";
const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

const downloadUrl = cloudinary.url(publicId, {
    resource_type: "raw",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
});

    console.log("Signed URL:", downloadUrl);

    https.get(downloadUrl, (resp) => {
        console.log("Status Code:", resp.statusCode);
        resp.on('data', () => {});
        resp.on('end', () => console.log("Done fetching"));
    }).on('error', (err) => {
        console.error("HTTP Error:", err.message);
    });
}
run();
