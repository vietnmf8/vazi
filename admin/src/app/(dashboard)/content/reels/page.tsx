"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import Pusher from "pusher-js";
import { getPusherClient } from "@/lib/soketi";
import { apiClient } from "@/lib/api";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import { UploadCloud, X, Loader2, Trash2, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
interface OptimisticUpload {
    id: string;
    file: File;
    previewUrl: string;
    status: UploadStatus;
    finalUrl?: string;
}
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/AlertDialog";

export default function ReelsAdminPage() {
    const [title, setTitle] = useState("");
    const [uploads, setUploads] = useState<OptimisticUpload[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // For Dashboard
    const [reels, setReels] = useState<any[]>([]);
    const [now, setNow] = useState(Date.now());

    // For Modal/Gallery Management
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [pendingUploads, setPendingUploads] = useState<string[]>([]);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
    const modalFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Interval for "MỚI" badge
        const interval = setInterval(() => setNow(Date.now()), 60000);

        // Fetch existing reels
        apiClient
            .get("/reels")
            .then((res) => setReels(res.data || []))
            .catch((err) => console.error(err));

        // Pusher real-time updates
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe("reels-channel");
        channel.bind("new-reel", (data: any) => {
            const formatted = {
                ...data,
                media:
                    typeof data.media === "string"
                        ? JSON.parse(data.media)
                        : data.media,
                reactions: [],
            };
            setReels((prev) => [
                formatted,
                ...prev.filter((r) => r.id !== data.id),
            ]);
        });

        channel.bind("update-reel", (data: any) => {
            const formatted = {
                ...data,
                media:
                    typeof data.media === "string"
                        ? JSON.parse(data.media)
                        : data.media,
            };
            setReels((prev) =>
                prev.map((r) => {
                    if (r.id === formatted.id) {
                        return { ...formatted, reactions: r.reactions }; // preserve reactions
                    }
                    return r;
                }),
            );

            // Cập nhật selectedGroup nếu đang mở
            setSelectedGroup((curr: any) =>
                curr?.id === formatted.id
                    ? { ...curr, ...formatted, reactions: curr.reactions }
                    : curr,
            );
        });

        channel.bind("delete-reel", (data: { id: string }) => {
            setReels((prev) => prev.filter((r) => r.id !== data.id));
            setSelectedGroup((curr: any) =>
                curr?.id === data.id ? null : curr,
            );
        });

        channel.bind(
            "new-reaction",
            (data: { reelId: string; reaction: any }) => {
                setReels((prev) =>
                    prev.map((group) => {
                        if (group.id === data.reelId) {
                            return {
                                ...group,
                                reactions: [
                                    data.reaction,
                                    ...(group.reactions || []),
                                ],
                            };
                        }
                        return group;
                    }),
                );
                setSelectedGroup((curr: any) => {
                    if (curr?.id === data.reelId) {
                        return {
                            ...curr,
                            reactions: [
                                data.reaction,
                                ...(curr.reactions || []),
                            ],
                        };
                    }
                    return curr;
                });
            },
        );

        return () => {
            clearInterval(interval);
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, []);

    // Background Worker cho Uploads
    useEffect(() => {
        const uploadingCount = uploads.filter((u) => u.status === "uploading").length;
        if (uploadingCount < 3) {
            const pendingUploads = uploads.filter((u) => u.status === "pending");
            if (pendingUploads.length > 0) {
                const toUpload = pendingUploads.slice(0, 3 - uploadingCount);
                toUpload.forEach(async (uploadItem) => {
                    // Đánh dấu là đang upload
                    setUploads((prev) =>
                        prev.map((u) =>
                            u.id === uploadItem.id
                                ? { ...u, status: "uploading" }
                                : u
                        )
                    );

                    try {
                        const presigned = await getPresignedUrl(uploadItem.file.name, uploadItem.file.type);
                        const url = await uploadToCloudinary(uploadItem.file, presigned);
                        setUploads((prev) =>
                            prev.map((u) =>
                                u.id === uploadItem.id
                                    ? { ...u, status: "success", finalUrl: url }
                                    : u
                            )
                        );
                    } catch (error) {
                        setUploads((prev) =>
                            prev.map((u) =>
                                u.id === uploadItem.id
                                    ? { ...u, status: "error" }
                                    : u
                            )
                        );
                    }
                });
            }
        }
    }, [uploads]);

    // -------- TẠO MỚI --------
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newUploads = files.map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            previewUrl: URL.createObjectURL(file),
            status: "pending" as const,
        }));
        setUploads((prev) => [...newUploads, ...prev]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (uploads.length === 0) {
            toast.error("Vui lòng upload ít nhất 1 ảnh");
            return;
        }

        if (uploads.some((u) => u.status !== "success")) {
            toast.error("Vui lòng chờ ảnh upload xong hoặc xóa ảnh bị lỗi");
            return;
        }

        const mediaUrls = uploads.map((u) => u.finalUrl).filter(Boolean) as string[];

        setLoading(true);
        try {
            await apiClient.post("/admin/reels", { title, mediaUrls });
            toast.success("Đã tạo Reel mới thành công!");
            setTitle("");
            setUploads([]);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.error?.message || "Lỗi tạo Reel",
            );
        } finally {
            setLoading(false);
        }
    };

    // -------- QUẢN LÝ GRID CHI TIẾT --------
    const handleModalFileChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (!selectedGroup) return;
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const objectUrls = files.map((file) => URL.createObjectURL(file));
        setPendingUploads((prev) => [...prev, ...objectUrls]);

        const newUrls: string[] = [];
        try {
            for (const file of files) {
                const presigned = await getPresignedUrl(file.name, file.type);
                const url = await uploadToCloudinary(file, presigned);
                newUrls.push(url);
            }

            const newMediaItems = newUrls.map((url, i) => ({
                id: Date.now().toString() + "-" + i,
                type: "image",
                url: url,
                duration: 5,
            }));

            const updatedMediaArray = [
                ...newMediaItems,
                ...(selectedGroup.media || []),
            ];

            await apiClient.patch(`/admin/reels/${selectedGroup.id}`, {
                media: updatedMediaArray,
            });
            toast.success("Đã thêm ảnh vào Story Group!");
        } catch (error) {
            console.error("Upload modal error:", error);
            toast.error("Lỗi khi thêm ảnh");
        } finally {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
            setPendingUploads([]);
            if (modalFileInputRef.current) modalFileInputRef.current.value = "";
        }
    };

    const confirmDeleteMedia = (mediaId: string) => {
        if (!selectedGroup) return;
        const updatedMediaArray = selectedGroup.media?.filter((m: any) => m.id !== mediaId) || [];
        if (updatedMediaArray.length === 0) {
            setGroupToDelete(selectedGroup.id);
        } else {
            setMediaToDelete(mediaId);
        }
    };

    const executeDeleteMedia = async () => {
        if (!selectedGroup || !mediaToDelete) return;
        const updatedMediaArray = selectedGroup.media?.filter((m: any) => m.id !== mediaToDelete) || [];
        
        try {
            await apiClient.patch(`/admin/reels/${selectedGroup.id}`, {
                media: updatedMediaArray,
            });
            toast.success("Đã xóa ảnh!");
        } catch (err) {
            toast.error("Lỗi khi xóa ảnh");
        } finally {
            setMediaToDelete(null);
        }
    };

    const confirmDeleteGroup = (groupId: string) => {
        setGroupToDelete(groupId);
    };

    const executeDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            await apiClient.delete(`/admin/reels/${groupToDelete}`);
            toast.success("Đã xóa Story Group!");
            setSelectedGroup(null);
            setGroupToDelete(null);
        } catch (err) {
            toast.error("Lỗi khi xóa Story Group");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-12 mt-8">
            <div className="bg-white rounded-xl shadow-md p-8">
                <h1 className="text-3xl font-bold mb-8">Tạo Reel Mới</h1>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-3">
                            Tiêu đề (Caption)
                        </label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề ngắn gọn..."
                            className="text-lg py-6 outline-none ring-0 border-0 bg-gray-50 focus-visible:ring-0 focus-visible:bg-gray-100 transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-3">
                            Hình ảnh
                        </label>
                        <div className="flex gap-6 flex-wrap">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-72 aspect-[9/16] rounded-xl flex flex-col items-center justify-center text-blue-600 hover:bg-blue-100 transition-all bg-blue-50"
                            >
                                <UploadCloud className="mb-3 w-8 h-8" />
                                <span className="text-base font-medium">Thêm ảnh</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                            />

                            {uploads.map((u) => (
                                <div
                                    key={u.id}
                                    className="relative group rounded-xl overflow-hidden bg-white h-72 aspect-[9/16] shadow-md border border-gray-200 transition-all hover:shadow-lg"
                                >
                                    <div className="absolute inset-0 overflow-hidden bg-gray-100">
                                        <img
                                            src={u.previewUrl}
                                            alt="Preview"
                                            className={`w-full h-full object-cover transition-opacity ${
                                                u.status === "pending" || u.status === "uploading"
                                                    ? "opacity-60"
                                                    : "opacity-100"
                                            }`}
                                        />
                                    </div>

                                    {/* Spinner */}
                                    {(u.status === "pending" || u.status === "uploading") && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-wait text-white">
                                            <Loader2 className="w-8 h-8 animate-spin drop-shadow-md" />
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {u.status === "error" && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-900/50 backdrop-blur-sm text-white transition-all">
                                            <AlertCircle className="w-8 h-8 text-red-50 drop-shadow-md mb-2" />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setUploads((prev) => prev.map((item) => item.id === u.id ? { ...item, status: "pending" } : item))}
                                                    className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                                                    title="Thử lại"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUploads((prev) => prev.filter((item) => item.id !== u.id))}
                                                    className="bg-red-500/80 hover:bg-red-500 p-2 rounded-full transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Normal Delete Button for Success/Pending */}
                                    {u.status !== "error" && (
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-red-500 transition-colors backdrop-blur-sm z-20"
                                            onClick={() =>
                                                setUploads((prev) =>
                                                    prev.filter(
                                                        (item) => item.id !== u.id
                                                    )
                                                )
                                            }
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <Button
                            type="submit"
                            disabled={
                                loading ||
                                uploads.length === 0
                            }
                            className="w-full text-lg py-6 !bg-[#0a0b0b] hover:!bg-blue-700 !text-white border-none shadow-md hover:shadow-lg transition-all"
                            size="lg"
                        >
                            {loading ? "Đang xử lý..." : "Đăng Reel"}
                        </Button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold mb-6">
                    Reels
                </h2>
                {/* Yêu cầu 3: Tối đa 1 hàng 3 item */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reels.map((reel) => (
                        <div
                            key={reel.id}
                            className="relative rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:ring-4 hover:ring-blue-500/30 transition-all shadow-md group"
                            onClick={() => setSelectedGroup(reel)}
                        >
                            {/* Nút Xoá Group khi Hover - Đặt dưới cùng chính giữa */}
                            <button
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteGroup(reel.id);
                                }}
                                title="Xóa toàn bộ Reel này"
                            >
                                <Trash2 size={20} />
                            </button>

                            {/* Thumbnail */}
                            <div className="relative aspect-[9/16] bg-black">
                                {reel.media && reel.media.length > 0 ? (
                                    <>
                                        <div className="absolute inset-0 overflow-hidden">
                                            <img
                                                src={reel.media[0].url}
                                                alt=""
                                                className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <UploadCloud className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm">Trống</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 pt-24 pointer-events-none flex flex-col gap-1.5">
                                    <h3 className="font-bold text-white text-xl line-clamp-2 leading-tight">
                                        {(reel.updatedAt || reel.createdAt) && (now - new Date(reel.updatedAt || reel.createdAt).getTime() <= 3 * 60 * 1000) && (
                                            <span className="bg-red-500 text-white text-xs uppercase font-bold px-2 py-0.5 rounded-sm mr-2 mb-1 inline-block shrink-0 leading-none">MỚI</span>
                                        )}
                                        {reel.title || "Reel"}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-300 font-medium">
                                            ❤ {reel.reactions?.length || 0}{" "}
                                            Tương tác
                                        </p>
                                        {reel.media &&
                                            reel.media.length > 1 && (
                                                <span className="text-sm font-bold text-white bg-black/60 px-4 py-1.5 rounded-md backdrop-blur-sm shrink-0">
                                                    +{reel.media.length - 1} ảnh
                                                </span>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {reels.length === 0 && (
                        <p className="text-gray-500 col-span-full py-8 text-center bg-gray-50 rounded-xl">
                            Chưa có Reel nào. Hãy tạo mới ở trên!
                        </p>
                    )}
                </div>
            </div>

            {/* Modal Xác nhận xóa Group */}
            <Dialog
                open={!!groupToDelete}
                onOpenChange={(open) => !open && setGroupToDelete(null)}
            >
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-2xl p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
                            <AlertTriangle size={32} />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            Xóa Reel
                        </DialogTitle>
                        <p className="text-gray-600 text-base">
                            Bạn có chắc chắn muốn xóa vĩnh viễn Reel này
                            cùng toàn bộ ảnh và tương tác không? Hành động này
                            không thể hoàn tác.
                        </p>
                        <div className="flex w-full gap-3 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full text-base py-6 bg-gray-50 hover:bg-gray-100 border-none text-gray-700"
                                onClick={() => setGroupToDelete(null)}
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full text-base py-6"
                                onClick={executeDeleteGroup}
                            >
                                Xóa Vĩnh Viễn
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Xác nhận xóa Ảnh (Media) */}
            <AlertDialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa ảnh?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa ảnh này khỏi Reel không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMediaToDelete(null); }}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); e.stopPropagation(); executeDeleteMedia(); }} className="bg-red-600 hover:bg-red-700 text-white border border-red-600">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Pure Cinematic Gallery Modal */}
            <Dialog
                open={!!selectedGroup}
                onOpenChange={(open) => !open && setSelectedGroup(null)}
            >
                <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-[100vw] w-screen h-[100dvh] rounded-none border-none bg-black/95 backdrop-blur-3xl p-6 md:p-12 m-0 flex flex-col overflow-y-auto text-white [&>button]:text-white [&>button]:top-6 [&>button]:right-6 [&>button]:w-12 [&>button]:h-12 [&>button]:bg-white/10 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button:hover]:bg-white/20 [&>button>svg]:w-6 [&>button>svg]:h-6">
                    <DialogTitle className="sr-only">
                        Quản lý kho ảnh: {selectedGroup?.title}
                    </DialogTitle>

                    {/* Khoảng cách rộng, ảnh to */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 pt-10 pb-20 max-w-screen-2xl mx-auto w-full">
                        {/* Nút Upload Bento (Bự, Cinematic) */}
                        <button
                            type="button"
                            onClick={() => modalFileInputRef.current?.click()}
                            className="relative aspect-[9/16] bg-[#0a0b0b] hover:bg-[#ffffff10] text-white rounded-2xl flex flex-col items-center justify-center transition-all group shadow-2xl border-none"
                        >
                            <UploadCloud className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform opacity-90 group-hover:opacity-100" />
                            <span className="text-lg font-semibold tracking-wide">
                                Thêm ảnh
                            </span>
                            <input
                                type="file"
                                ref={modalFileInputRef}
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handleModalFileChange}
                            />
                        </button>

                        {/* Các file đang Upload (Optimistic UI) */}
                        {pendingUploads.map((previewUrl, i) => (
                            <div
                                key={`pending-${i}`}
                                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black/50 border-none"
                            >
                                <img
                                    src={previewUrl}
                                    className="w-full h-full object-contain blur-[6px] opacity-40 scale-105"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-blue-600 p-5 rounded-full shadow-2xl backdrop-blur-md border-none">
                                        <Loader2 className="w-10 h-10 animate-spin text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {selectedGroup?.media?.map((m: any, i: number) => (
                            <div
                                key={m.id || i}
                                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 group shadow-2xl border border-white/10 transition-all"
                            >
                                <div className="absolute inset-0 overflow-hidden">
                                    <img
                                        src={m.url}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                <button
                                    className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-md text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:scale-110 shadow-xl z-20 pointer-events-auto"
                                    onClick={() => confirmDeleteMedia(m.id)}
                                    title="Xóa ảnh này"
                                >
                                    <X size={20} className="stroke-[2.5]" />
                                </button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
