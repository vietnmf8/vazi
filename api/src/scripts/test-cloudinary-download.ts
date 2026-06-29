import { v2 as cloudinary } from "cloudinary";
import https from "https";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: "d:\\F8_K15_BTVN\\FASTVISA\\api\\.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
    const pdfPath = "d:\\F8_K15_BTVN\\FASTVISA\\docs\\VietNam_eVisa_E260616NZLLT50817935.pdf";
    console.log("Uploading...");
    const res = await cloudinary.uploader.upload(pdfPath, { resource_type: "raw" });
    console.log("Upload result:", res.public_id, res.secure_url);

    const downloadUrl = res.secure_url;

    https.get(downloadUrl, (resp) => {
        console.log("Status Code:", resp.statusCode);
        resp.on('data', () => {});
        resp.on('end', () => console.log("Done fetching"));
    }).on('error', (err) => {
        console.error("HTTP Error:", err.message);
    });
}
run();
