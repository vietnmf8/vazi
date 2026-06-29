import { v2 as cloudinary } from 'cloudinary';
import { getEnv } from '@/configs/env.config';

cloudinary.config({
  cloud_name: getEnv().CLOUDINARY_CLOUD_NAME,
  api_key: getEnv().CLOUDINARY_API_KEY,
  api_secret: getEnv().CLOUDINARY_API_SECRET,
});

/**
 * Extracts the first <img src="..."> from HTML, downloads the image, uploads to Cloudinary,
 * and replaces the src attribute with the new Cloudinary URL.
 */
export async function extractAndUploadImage(html: string): Promise<string> {
    const imgRegex = /<img[^>]+src="([^">]+)"/i;
    const match = html.match(imgRegex);
    
    if (!match || !match[1]) {
        return html; // No image found
    }
    
    const imageUrl = match[1];
    
    // Skip if already a cloudinary url
    if (imageUrl.includes('res.cloudinary.com')) {
        return html;
    }
    
    try {
        console.log(`[image-processor] Downloading image: ${imageUrl}`);
        const res = await fetch(imageUrl);
        if (!res.ok) {
            console.error(`[image-processor] Failed to fetch image, status: ${res.status}`);
            return html;
        }
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`[image-processor] Uploading to Cloudinary...`);
        const cloudinaryUrl = await new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'fastvisa/campaigns' },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error("No result from Cloudinary"));
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        });
        
        console.log(`[image-processor] Cloudinary upload successful: ${cloudinaryUrl}`);
        
        // Replace in HTML
        return html.replace(imageUrl, cloudinaryUrl);
    } catch (err) {
        console.error(`[image-processor] Error processing image:`, err);
        return html; // Return original on error
    }
}
