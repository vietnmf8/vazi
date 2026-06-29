"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Image as ImageIcon, Loader2 } from "lucide-react";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Button } from "./Button";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import { showToast } from "@/components/ui/Toast";

interface TiptapEditorProps {
 value: string;
 onChange: (html: string) => void;
 placeholder?: string;
}

export function TiptapEditor({ value, onChange, placeholder }: TiptapEditorProps) {
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [uploading, setUploading] = useState(false);

 const handleUploadImage = async (file: File) => {
 if (!file.type.startsWith("image/")) {
 showToast("Chỉ hỗ trợ upload ảnh", "error");
 return null;
 }
 try {
 setUploading(true);
 const presigned = await getPresignedUrl(file.name, file.type);
 const url = await uploadToCloudinary(file, presigned);
 return url;
 } catch (error) {
 showToast("Upload ảnh thất bại", "error");
 return null;
 } finally {
 setUploading(false);
 }
 };

 const extensions = useMemo(() => [
 StarterKit,
 Image,
 Placeholder.configure({
 placeholder: placeholder || "Write content here...",
 }),
], [placeholder]);

 const editor = useEditor({
 extensions,
 content: value,
 onUpdate: ({ editor }) => {
 onChange(editor.getHTML());
 },
 immediatelyRender: false,
 editorProps: {
 attributes: {
 class: "prose prose-base text-base leading-snug prose-p:my-1 prose-headings:my-2 mx-auto focus:outline-none min-h-[200px] p-4 border rounded-b-md bg-white",
 },
 handlePaste: (view, event) => {
 const items = Array.from(event.clipboardData?.items || []);
 const imageItems = items.filter(item => item.type.indexOf('image') === 0);
 
 if (imageItems.length === 0) return false;
 
 event.preventDefault();
 const file = imageItems[0].getAsFile();
 if (file) {
 handleUploadImage(file).then(url => {
 if (url) {
 const node = view.state.schema.nodes.image.create({ src: url });
 const transaction = view.state.tr.replaceSelectionWith(node);
 view.dispatch(transaction);
 }
 });
 }
 return true;
 },
 handleDrop: (view, event, slice, moved) => {
 if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
 const file = event.dataTransfer.files[0];
 if (file.type.startsWith("image/")) {
 event.preventDefault();
 const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
 if (!coordinates) return false;

 handleUploadImage(file).then(url => {
 if (url) {
 const node = view.state.schema.nodes.image.create({ src: url });
 const transaction = view.state.tr.insert(coordinates.pos, node);
 view.dispatch(transaction);
 }
 });
 return true;
 }
 }
 return false;
 }
 },
 });

 useEffect(() => {
 if (editor && value !== editor.getHTML()) {
 editor.commands.setContent(value);
 }
 }, [value, editor]);

 if (!editor) {
 return null;
 }

 return (
 <div className="w-full border rounded-md shadow-sm flex flex-col">
 <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-gray-50 rounded-t-md">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleBold().run()}
 className={editor.isActive("bold") ? "bg-gray-200" : ""}
 >
 <Bold className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleItalic().run()}
 className={editor.isActive("italic") ? "bg-gray-200" : ""}
 >
 <Italic className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
 className={editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""}
 >
 <Heading1 className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
 className={editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""}
 >
 <Heading2 className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleBulletList().run()}
 className={editor.isActive("bulletList") ? "bg-gray-200" : ""}
 >
 <List className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => editor.chain().focus().toggleOrderedList().run()}
 className={editor.isActive("orderedList") ? "bg-gray-200" : ""}
 >
 <ListOrdered className="w-4 h-4" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 disabled={uploading}
 onClick={() => fileInputRef.current?.click()}
 >
 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
 </Button>
 <input
 type="file"
 ref={fileInputRef}
 className="hidden"
 accept="image/*"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (file) {
 const url = await handleUploadImage(file);
 if (url) {
 editor.chain().focus().setImage({ src: url }).run();
 }
 }
 if (fileInputRef.current) fileInputRef.current.value = "";
 }}
 />
 </div>
 <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
 <style jsx global>{`
 .ProseMirror p.is-editor-empty:first-child::before {
 color: #adb5bd;
 content: attr(data-placeholder);
 float: left;
 height: 0;
 pointer-events: none;
 }
 .ProseMirror img {
 max-width: 100%;
 height: auto;
 border-radius: 0.5rem;
 }
 `}</style>
 </div>
 );
}
