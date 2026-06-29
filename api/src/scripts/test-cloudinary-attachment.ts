import dotenv from "dotenv";
dotenv.config({ path: "d:\\F8_K15_BTVN\\FASTVISA\\api\\.env" });

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testAttachment() {
    const publicId = "fastvisa/test/xab1v1xk7errj9sqfm80.pdf"; // A valid raw public_id from earlier
    const downloadUrl = cloudinary.url(publicId, {
        resource_type: "raw",
        secure: true,
        sign_url: true,
        flags: "attachment:JUGALBOT_MARDY",
    });
    console.log("URL with attachment flag:", downloadUrl);
}

testAttachment().catch(console.error);
