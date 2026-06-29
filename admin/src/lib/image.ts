/**
 * Nén và resize hình ảnh phía client bằng Canvas API.
 *
 * Giới hạn 1600px và JPEG 80% để giảm dung lượng upload mà vẫn giữ độ sắc nét hiển thị.
 *
 * @param file - File ảnh từ input trình duyệt
 * @returns Chuỗi Base64 JPEG đã nén
 */
export function compressImage(file: File): Promise<string> {
 return new Promise((resolve, reject) => {
 if (!file.type.startsWith("image/")) {
 reject(new Error("Invalid image file"))
 return
 }

 const MAX_WIDTH = 1600
 const MAX_HEIGHT = 1600
 const objectUrl = URL.createObjectURL(file)
 const img = new Image()

 img.onload = () => {
 let width = img.width
 let height = img.height

 if (width > height) {
 if (width > MAX_WIDTH) {
 height = Math.round((height * MAX_WIDTH) / width)
 width = MAX_WIDTH
 }
 } else if (height > MAX_HEIGHT) {
 width = Math.round((width * MAX_HEIGHT) / height)
 height = MAX_HEIGHT
 }

 const canvas = document.createElement("canvas")
 canvas.width = width
 canvas.height = height

 const ctx = canvas.getContext("2d")
 if (!ctx) {
 URL.revokeObjectURL(objectUrl)
 reject(new Error("Canvas 2D unavailable"))
 return
 }

 ctx.drawImage(img, 0, 0, width, height)
 const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8)
 URL.revokeObjectURL(objectUrl)
 resolve(compressedDataUrl)
 }

 img.onerror = (err) => {
 URL.revokeObjectURL(objectUrl)
 reject(err)
 }

 img.src = objectUrl
 })
}
