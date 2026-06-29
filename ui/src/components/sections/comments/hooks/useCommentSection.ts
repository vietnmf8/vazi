import { useState, useEffect } from "react";
import Pusher from "pusher-js";
import toast from "react-hot-toast";
import type { Comment } from "../types";
import {
  addReplyRecursive,
  editCommentRecursive,
  deleteCommentRecursive,
  helpfulCommentRecursive,
  findCommentByIdRecursive,
  triggerConfettiBurst,
} from "../helpers";
import { getCountryCode, COUNTRIES } from "../constants";
import { commentsClient, hashEmailToToken, getStoredAuthorToken, storeAuthorToken, uploadImagesToCloudinary, type ApiComment } from "@/lib/comments.client"

function buildCommentTree(flat: ApiComment[]): Comment[] {
  const map = new Map<string, Comment>()
  for (const c of flat) {
    map.set(c.id, {
      id: c.id,
      ownerId: c.authorToken,
      authorName: c.authorName,
      authorType: "guest",
      nationality: c.authorNationality ? (COUNTRIES.find(x => x.code.toLowerCase() === c.authorNationality!.toLowerCase())?.name || c.authorNationality) : undefined,
      countryCode: c.authorNationality?.toLowerCase() ?? undefined,
      date: new Date(c.createdAt).toLocaleDateString(),
      content: c.content || "",
      images: c.images ?? undefined,
      helpfulCount: c.helpfulCount,
      originalLanguage: c.originalLanguage ?? undefined,
      translatedContent: c.translatedContent ?? undefined,
      hasVoted: false,
      replies: [],
    })
  }
  const roots: Comment[] = []
  for (const c of flat) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies = map.get(c.parentId)!.replies ?? []
      map.get(c.parentId)!.replies!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// getSessionOwnerId removed

function getStoredEmail(): string {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("comment_email") || "";
  }
  return "";
}

function getStoredName(): string {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("comment_name") || "";
  }
  return "";
}

function getStoredNationality(): string {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("comment_nationality") || "Vietnam";
  }
  return "Vietnam";
}

function hasStoredNationality(): boolean {
  if (typeof window !== "undefined") {
    return !!sessionStorage.getItem("comment_nationality");
  }
  return false;
}

export function useCommentSection() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionOwnerId, _setSessionOwnerId] = useState<string | null>(null);
  const [nameDisabled, setNameDisabled] = useState(false);
  const [emailDisabled, setEmailDisabled] = useState(false);

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [nationalityDisabled, setNationalityDisabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchComments = () => {
      commentsClient.getAll().then((flat) => {
        if (!cancelled) {
          setComments(buildCommentTree(flat));
          setIsLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    };

    fetchComments();

    const key = process.env.NEXT_PUBLIC_SOKETI_KEY;
    let pusher: Pusher | null = null;
    
    if (key) {
      pusher = new Pusher(key, {
        cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
        wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
        wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
        wssPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
        forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
        enabledTransports: ["ws"],
        enableStats: false,
      });

      const channel = pusher.subscribe("public-comments");
      channel.bind("comments_updated", () => {
        fetchComments();
      });
    }

    return () => { 
      cancelled = true; 
      if (pusher) {
        pusher.unsubscribe("public-comments");
        pusher.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const name = getStoredName();
    const emailVal = getStoredEmail();
    const nat = getStoredNationality();
    const sid = getStoredAuthorToken();

    const timer = setTimeout(() => {
      if (name) {
        setFullname(name);
        setNameDisabled(true);
      }
      if (emailVal) {
        setEmail(emailVal);
        setEmailDisabled(true);
      }
      if (nat) {
        setNationality(nat);
        setNationalityDisabled(hasStoredNationality());
      }
      if (sid) _setSessionOwnerId(sid);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [activeReplyToName, setActiveReplyToName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [editPendingImages, setEditPendingImages] = useState<string[]>([]);
  const [replyPendingImages, setReplyPendingImages] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const ensureSession = (): string => {
    let id = sessionOwnerId || getStoredAuthorToken();
    if (!id) {
      id = crypto.randomUUID();
      _setSessionOwnerId(id);
    }
    return id;
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;

    const token = getStoredAuthorToken();
    if (!token) return;

    const currentEditText = editText.trim();
    const currentEditImages = [...editPendingImages];

    // Capture snapshot
    let snapshot: Comment[] = [];
    setComments((prev) => {
      snapshot = prev;
      return editCommentRecursive(
        prev,
        id,
        currentEditText,
        currentEditImages.length > 0 ? currentEditImages : undefined
      );
    });

    setEditingId(null);
    setEditText("");
    setEditPendingImages([]);

    try {
      const uploadedUrls = currentEditImages.length > 0
        ? await uploadImagesToCloudinary(currentEditImages)
        : [];

      await commentsClient.edit(id, token, {
        content: currentEditText,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      });
    } catch {
      // Revert if error
      setComments(snapshot);
    }
  };

  const handleStartEdit = (
    id: string,
    currentContent: string,
    currentImages?: string[]
  ) => {
    setEditingId(id);
    setEditText(currentContent);
    setEditPendingImages(currentImages ?? []);
  };

  const realHandleDelete = async (id: string) => {
    const token = getStoredAuthorToken();
    if (!token) return;

    // Capture snapshot inside the updater so it reflects state at deletion time,
    // not the stale closure value.
    let snapshot: Comment[] = [];
    setComments((prev) => {
      snapshot = prev;
      return deleteCommentRecursive(prev, id);
    });

    try {
      await commentsClient.delete(id, token);
    } catch {
      setComments(snapshot);
    }
  };

  const handleHelpful = (
    id: string,
    currentlyVoted: boolean,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const btnElement = e.currentTarget;
    if (!currentlyVoted) {
      triggerConfettiBurst(btnElement, e);
    }
    setComments((prevComments) => helpfulCommentRecursive(prevComments, id));
    void commentsClient.helpful(id);
  };

  const handleAddQuestion = async (data: {
    qfullname: string;
    qemail: string;
    qmessage: string;
    qnationality: string;
    qimages?: string[];
  }) => {
    const token = await hashEmailToToken(data.qemail);
    storeAuthorToken(token);
    _setSessionOwnerId(token);

    const tempId = `temp_${crypto.randomUUID()}`;
    const optimistic: Comment = {
      id: tempId,
      clientId: tempId,
      ownerId: token,
      authorName: data.qfullname,
      authorType: "guest",
      nationality: data.qnationality,
      date: "Just now",
      content: data.qmessage,
      images: data.qimages,
      helpfulCount: 0,
      replies: [],
      isPending: true,
    };
    setComments((prev) => [optimistic, ...prev]);

    try {
      const uploadedUrls = data.qimages && data.qimages.length > 0
        ? await uploadImagesToCloudinary(data.qimages)
        : [];

      const created = await commentsClient.create({
        content: data.qmessage,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        authorName: data.qfullname,
        authorEmail: data.qemail,
        authorNationality: data.qnationality ? getCountryCode(data.qnationality).toUpperCase() : undefined,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: created.id, isPending: undefined } : c
        )
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    }
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!fullname.trim()) {
      toast.error("Vui lòng nhập Họ và Tên của bạn.");
      return;
    }

    if (!email.trim()) {
      setEmailError("Vui lòng nhập Địa chỉ Email.");
      return;
    }

    if (!nationality) {
      toast.error("Vui lòng chọn Quốc tịch.");
      return;
    }

    if (!message.trim() && pendingImages.length === 0) {
      toast.error("Vui lòng nhập nội dung câu hỏi.");
      return;
    }

    // TẠI SAO: Validate định dạng email của khách hàng để đảm bảo hệ thống không lưu email rác lỗi định dạng.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.");
      return;
    }

    const existingEmail = sessionStorage.getItem("comment_email");
    if (existingEmail && existingEmail !== email.trim()) {
      setEmailError(
        "Email này khác với email bạn đã gửi lần trước. Vui lòng sử dụng lại email cũ: " +
          existingEmail
      );
      return;
    }

    // Fake timer removed for pure Optimistic UI

    sessionStorage.setItem("comment_email", email.trim());
    sessionStorage.setItem("comment_name", fullname.trim());
    sessionStorage.setItem("comment_nationality", nationality);

    setNameDisabled(true);
    setEmailDisabled(true);
    setNationalityDisabled(true);

    const currentMessage = message.trim();
    const currentImages = [...pendingImages];
    
    // Clear forms immediately for Optimistic UI
    setMessage("");
    setPendingImages([]);

    await handleAddQuestion({
      qfullname: fullname.trim(),
      qemail: email.trim(),
      qmessage: currentMessage,
      qnationality: nationality,
      qimages: currentImages,
    });
  };

  const handleReplySubmit = async (parentId: string, replyNationality: string) => {
    if (!replyText.trim() && replyPendingImages.length === 0) return;

    // TẠI SAO: Khách vãng lai chưa từng gửi câu hỏi (chưa lưu email trong sessionStorage) bắt buộc phải điền đầy đủ
    // Họ tên, Email, Quốc tịch để có thể phản hồi bình luận. Ta cần validate đầy đủ và chính xác giống như khi gửi câu hỏi mới.
    const isGuest = !sessionStorage.getItem("comment_email");
    if (isGuest) {
      if (!fullname.trim()) {
        toast.error("Vui lòng nhập Họ và Tên của bạn.");
        return;
      }
      if (!email.trim()) {
        toast.error("Vui lòng nhập Địa chỉ Email.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Địa chỉ Email không đúng định dạng. Vui lòng kiểm tra lại.");
        return;
      }
      if (!replyNationality) {
        toast.error("Vui lòng chọn Quốc tịch.");
        return;
      }
    }

    const ownerId = ensureSession();
    const storedUserName = sessionStorage.getItem("comment_name");

    if (isGuest) {
      sessionStorage.setItem("comment_email", email.trim());
      sessionStorage.setItem("comment_name", fullname.trim());
      sessionStorage.setItem("comment_nationality", replyNationality);
      
      // Đồng bộ trạng thái vô hiệu hóa trường nhập thông tin trên toàn UI
      setNameDisabled(true);
      setEmailDisabled(true);
      setNationalityDisabled(true);
    } else if (replyNationality && !sessionStorage.getItem("comment_nationality")) {
      sessionStorage.setItem("comment_nationality", replyNationality);
      setNationality(replyNationality);
    }

    const tempId = `r_${crypto.randomUUID()}`;
    const replyComment: Comment = {
      id: tempId,
      clientId: tempId,
      ownerId,
      authorName: storedUserName || fullname.trim() || "Guest",
      authorType: "guest",
      nationality:
        replyNationality ||
        sessionStorage.getItem("comment_nationality") ||
        "Traveler",
      date: "Just now",
      content: replyText.trim(),
      replyTo: activeReplyToName || undefined,
      images: replyPendingImages.length > 0 ? [...replyPendingImages] : undefined,
      helpfulCount: 0,
      isPending: true,
    };

    setComments((prev) => addReplyRecursive(prev, parentId, replyComment));

    const currentReplyText = replyText.trim();
    const currentReplyImages = [...replyPendingImages];

    // Clear forms immediately for Optimistic UI
    setReplyingToId(null);
    setReplyText("");
    setReplyPendingImages([]);
    setActiveReplyToName(null);

    try {
      const uploadedUrls = currentReplyImages.length > 0
        ? await uploadImagesToCloudinary(currentReplyImages)
        : [];

      const created = await commentsClient.create({
        content: currentReplyText,
        images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        authorName: replyComment.authorName,
        authorEmail: sessionStorage.getItem("comment_email") || "guest@example.com",
        authorNationality: getCountryCode(replyComment.nationality!).toUpperCase(),
        parentId: parentId,
      });

      setComments((prev) => {
        const updateId = (list: Comment[]): Comment[] => list.map(c => {
          if (c.id === tempId) return { ...c, id: created.id, isPending: undefined };
          if (c.replies) return { ...c, replies: updateId(c.replies) };
          return c;
        });
        return updateId(prev);
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReplyQuick = (parentId: string, text: string) => {
    const ownerId = ensureSession();
    const storedUserName = sessionStorage.getItem("comment_name");

    const parentComment = findCommentByIdRecursive(comments, parentId);
    const parentAuthor = parentComment ? parentComment.authorName : undefined;

    const isSelf =
      parentComment &&
      ((sessionOwnerId && parentComment.ownerId === sessionOwnerId) ||
        (storedUserName &&
          parentComment.authorName.toLowerCase() ===
            storedUserName.trim().toLowerCase()));

    const tempId = `r_${crypto.randomUUID()}`;
    const replyComment: Comment = {
      id: tempId,
      clientId: tempId,
      ownerId,
      authorName: storedUserName || "Guest",
      authorType: "guest",
      nationality: sessionStorage.getItem("comment_nationality") || "Traveler",
      date: "Just now",
      content: text.trim(),
      replyTo: isSelf ? undefined : parentAuthor,
      helpfulCount: 0,
      isPending: true,
    };

    setComments((prev) => addReplyRecursive(prev, parentId, replyComment));

    commentsClient.create({
      content: text.trim(),
      authorName: replyComment.authorName,
      authorEmail: sessionStorage.getItem("comment_email") || "guest@example.com",
      authorNationality: getCountryCode(replyComment.nationality!).toUpperCase(),
      parentId: parentId,
    }).then((created) => {
      setComments((prev) => {
        const updateId = (list: Comment[]): Comment[] => list.map(c => {
          if (c.id === tempId) return { ...c, id: created.id, isPending: undefined };
          if (c.replies) return { ...c, replies: updateId(c.replies) };
          return c;
        });
        return updateId(prev);
      });
    }).catch(console.error);
  };

  const startReply = (id: string, authorName: string) => {
    setReplyingToId(id);
    setActiveReplyToName(authorName);
    setReplyText("");
    setReplyPendingImages([]);
  };

  const cancelReply = () => {
    setReplyingToId(null);
    setActiveReplyToName(null);
    setReplyText("");
    setReplyPendingImages([]);
  };

  return {
    comments,
    isLoading,
    sessionOwnerId,
    nameDisabled,
    emailDisabled,
    fullname,
    setFullname,
    email,
    setEmail,
    nationality,
    setNationality,
    nationalityDisabled,
    activeReplyToName,
    setActiveReplyToName,
    message,
    setMessage,
    isSubmitting,
    emailError,
    setEmailError,
    pendingImages,
    setPendingImages,
    editPendingImages,
    setEditPendingImages,
    replyPendingImages,
    setReplyPendingImages,
    editingId,
    setEditingId,
    editText,
    setEditText,
    replyingToId,
    replyText,
    setReplyText,
    deleteConfirmId,
    setDeleteConfirmId,
    handleSaveEdit,
    handleStartEdit,
    realHandleDelete,
    handleHelpful,
    handleInlineSubmit,
    handleReplySubmit,
    handleReplyQuick,
    startReply,
    cancelReply,
  };
}
