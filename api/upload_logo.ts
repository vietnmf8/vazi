import { v2 as cloudinary } from "cloudinary";
import path from "path";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  try {
    const logoPath = path.resolve(__dirname, "../ui/public/logo-lm.png");
    console.log("Uploading logo from:", logoPath);
    const result = await cloudinary.uploader.upload(logoPath, {
      folder: "fastvisa/assets",
      public_id: "logo-lm",
      overwrite: true,
    });
    console.log("Upload Success!");
    console.log("Secure URL:", result.secure_url);
  } catch (err) {
    console.error("Upload Failed:", err);
  }
}

run();
