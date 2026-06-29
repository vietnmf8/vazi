import React, { useState, useRef } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/Button"
import { SaveButton } from "@/components/shared/SaveButton"
import { ImagePlus, X, Pencil, Trash2, Reply } from "lucide-react"
import { m } from "framer-motion"
import type { AdminCommentListItem, AdminCommentDetailItem } from "@/types/api"
import { compressImage } from "@/lib/image"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/upload"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/AlertDialog"

interface AdminCommentItemProps {
 comment: AdminCommentListItem | AdminCommentDetailItem;
 depth?: number;
 onReply: (parentId: string, content: string, images?: string[]) => Promise<void>;
 onEdit: (id: string, content: string, images?: string[]) => Promise<void>;
 onDelete: (id: string) => Promise<void>;
}

export function AdminCommentItemInner({ comment, depth = 0, onReply, onEdit, onDelete }: AdminCommentItemProps) {
 const [isReplying, setIsReplying] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [showOriginal, setShowOriginal] = useState(false);
 
 const [text, setText] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 
 // For images
 const [images, setImages] = useState<{ url: string; file?: File; isNew: boolean }[]>([]);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [previewImage, setPreviewImage] = useState<string | null>(null);

 const isAdminComment = comment.author_name === "FastVisa Support";
 const hasReplies = 'replies' in comment && Array.isArray(comment.replies) && comment.replies.length > 0;

 const resetForm = () => {
 setIsReplying(false);
 setIsEditing(false);
 setText("");
 setImages([]);
 if (fileInputRef.current) fileInputRef.current.value = "";
 };

 const handleStartReply = () => {
 resetForm();
 setIsReplying(true);
 };

 const handleStartEdit = () => {
 resetForm();
 setIsEditing(true);
 setText(comment.content || "");
 if (comment.images && comment.images.length > 0) {
 setImages(comment.images.map(url => ({ url, isNew: false })));
 }
 };

 const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (!e.target.files) return;
 const files = Array.from(e.target.files);
 
 // Validate max 5 images
 if (images.length + files.length > 5) {
 alert("Tối đa 5 ảnh.");
 return;
 }

 const newImages = files.map(file => ({
 url: URL.createObjectURL(file),
 file,
 isNew: true
 }));
 setImages(prev => [...prev, ...newImages]);
 };

 const removeImage = (index: number) => {
 setImages(prev => prev.filter((_, i) => i !== index));
 };

 const handleSubmit = async () => {
 if (!text.trim() && images.length === 0) return;
 setIsSubmitting(true);
 try {
 // 1. Upload new images
 const finalImages: string[] = [];
 for (const img of images) {
 if (!img.isNew) {
 finalImages.push(img.url);
 } else if (img.file) {
 // Upload
 const compressedUrl = await compressImage(img.file);
 // base64 to file
 const arr = compressedUrl.split(',');
 const mimeMatch = arr[0].match(/:(.*?);/);
 const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
 const bstr = atob(arr[1]);
 let n = bstr.length;
 const u8arr = new Uint8Array(n);
 while (n--) {
 u8arr[n] = bstr.charCodeAt(n);
 }
 const compressedFile = new File([u8arr], img.file.name, { type: mime });
 
 const presigned = await getPresignedUrl(img.file.name, mime);
 const url = await uploadToCloudinary(compressedFile, presigned);
 finalImages.push(url);
 }
 }

 if (isEditing) {
 await onEdit(comment.id, text, finalImages.length > 0 ? finalImages : undefined);
 } else {
 await onReply(comment.id, text, finalImages.length > 0 ? finalImages : undefined);
 }
 resetForm();
 } catch (error) {
 console.error(error);
 alert("Có lỗi xảy ra khi lưu bình luận hoặc upload ảnh.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className={`space-y-4 ${depth > 0 ? "ml-8 pl-4 border-l-2 border-gray-200" : ""}`}>
 <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-gray-300">
 <div className="flex justify-between items-center mb-2">
 <div className="flex items-center flex-wrap gap-2">
 <span className="font-semibold text-gray-900">{comment.author_name}</span>
 <span className="text-gray-500 text-sm">{comment.author_email}</span>
 {isAdminComment && (
 <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Support Agent</span>
 )}
 </div>
 <span className="text-gray-400 text-xs">{format(new Date(comment.created_at), "dd/MM/yyyy HH:mm")}</span>
 </div>
 
 {!isEditing && (
 <>
 <div className="text-gray-700 whitespace-pre-wrap text-sm mb-3">
 {comment.original_language && comment.original_language !== "vi" && comment.translated_content ? (
 <>
 <p>{showOriginal ? comment.content : comment.translated_content}</p>
 <div className="flex items-center gap-2 mt-2 w-fit">
 <button
 type="button"
 onClick={() => setShowOriginal(!showOriginal)}
 className={cn(
 "relative h-6 w-11 rounded-full transition-colors duration-300 flex items-center p-0.5 shrink-0 select-none cursor-pointer",
 showOriginal ? "bg-[#2563eb]" : "bg-zinc-400"
 )}
 aria-label="Toggle language"
 >
 <m.div
 initial={false}
 className="size-5 rounded-full bg-white shadow-xs"
 animate={{ x: showOriginal ? 20 : 0 }}
 transition={{ type: "spring", stiffness: 500, damping: 30 }}
 />
 </button>
 <span className="font-medium text-[10px] text-gray-500 select-none cursor-pointer" onClick={() => setShowOriginal(!showOriginal)}>
 {showOriginal ? "Hiển thị bản gốc (" + comment.original_language.toUpperCase() + ")" : "Hiển thị Tiếng Việt"}
 </span>
 </div>
 </>
 ) : (
 <p>{comment.content}</p>
 )}
 </div>
 {comment.images && comment.images.length > 0 && (
 <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
 {comment.images.map((url, i) => (
 <img 
 key={i} 
 src={url} 
 alt="Comment attachment" 
 className="h-20 w-auto rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity" 
 onClick={() => setPreviewImage(url)}
 />
 ))}
 </div>
 )}
 </>
 )}
 
 {!isEditing && !isReplying && (
 <div className="flex gap-3 mt-2">
 <button onClick={handleStartReply} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors">
 <Reply className="w-3 h-3" /> Trả lời
 </button>
 {isAdminComment && (
 <button onClick={handleStartEdit} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors">
 <Pencil className="w-3 h-3" /> Sửa
 </button>
 )}
     <AlertDialog>
      <AlertDialogTrigger asChild>
       <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors">
        <Trash2 className="w-3 h-3" /> Xóa
       </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
       <AlertDialogHeader>
        <AlertDialogTitle>Xác nhận xoá bình luận?</AlertDialogTitle>
        <AlertDialogDescription>
         Bạn có chắc chắn muốn xoá bình luận này không? Hành động này không thể hoàn tác.
        </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
        <AlertDialogCancel className="border-none bg-transparent hover:bg-gray-100">Huỷ</AlertDialogCancel>
        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onDelete(comment.id)}>Xoá</AlertDialogAction>
       </AlertDialogFooter>
      </AlertDialogContent>
     </AlertDialog>
 </div>
 )}

 {(isReplying || isEditing) && (
 <div className="mt-4 pt-4 border-t border-gray-100">
 <p className="text-xs font-medium text-gray-500 mb-2">
 {isEditing ? "Chỉnh sửa bình luận" : <>Trả lời với tư cách: <span className="text-blue-600 font-semibold">FastVisa Support</span></>}
 </p>
 <textarea
 value={text}
 onChange={(e) => setText(e.target.value)}
 placeholder="Nhập nội dung..."
 className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px]"
 />
 
 {images.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-2">
 {images.map((img, i) => (
 <div key={i} className="relative">
 <img src={img.url} className="h-16 w-16 object-cover rounded border" alt="Preview" />
 <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
 <X className="w-3 h-3" />
 </button>
 </div>
 ))}
 </div>
 )}

 <div className="flex justify-between items-center mt-3">
 <input
 type="file"
 multiple
 accept="image/jpeg,image/png,image/webp"
 className="hidden"
 ref={fileInputRef}
 onChange={handleFileChange}
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
 disabled={images.length >= 5}
 >
 <ImagePlus className="w-4 h-4" /> Đính kèm ảnh ({images.length}/5)
 </button>

  <div className="flex gap-2">
  <Button variant="outline" size="sm" onClick={resetForm}>Hủy</Button>
  
  {/* TẠI SAO: Đồng bộ style nút "Lưu" của form phản hồi admin với nút "Lưu" ở Edit Panel
      (Sử dụng màu xanh thương hiệu #2563eb, hover mượt mà và hiển thị icon loading xoay tròn khi đang gửi). */}
  <SaveButton 
    size="sm" 
    onClick={handleSubmit} 
    isLoading={isSubmitting} 
    disabled={(!text.trim() && images.length === 0)}
    label="Lưu"
  />
  </div>
 </div>
 </div>
 )}
 </div>

 {hasReplies && (
 <div className="space-y-4">
 {(comment as AdminCommentDetailItem).replies.map(reply => (
 <AdminCommentItem 
 key={reply.id} 
 comment={reply} 
 depth={depth + 1} 
 onReply={onReply} 
 onEdit={onEdit}
 onDelete={onDelete} 
 />
 ))}
 </div>
 )}

 {previewImage && (
 <div 
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-200"
 onClick={() => setPreviewImage(null)}
 >
 <div className="relative max-w-4xl max-h-[90vh] p-4 flex flex-col items-center">
 <button 
 className="absolute top-2 right-2 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full"
 onClick={() => setPreviewImage(null)}
 >
 <X className="w-5 h-5" />
 </button>
 <img 
 src={previewImage} 
 className="max-w-full max-h-[85vh] object-contain rounded" 
 alt="Preview large" 
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 </div>
 )}
 </div>
 )
}

function isTargetOrDescendant(c: AdminCommentListItem | AdminCommentDetailItem, targetId: string | null): boolean {
 if (!targetId) return false;
 if (c.id === targetId) return true;
 if (!('replies' in c) || !c.replies) return false;
 return c.replies.some(child => isTargetOrDescendant(child, targetId));
}

export const AdminCommentItem = React.memo(AdminCommentItemInner, (prev, next) => {
 return prev.comment === next.comment && prev.depth === next.depth;
});
