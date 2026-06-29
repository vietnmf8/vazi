import type { Comment } from "./types"

/**
 * Thêm một bình luận phản hồi sâu vào bình luận có targetId trong cây bình luận đệ quy.
 * TẠI SAO dùng đệ quy: Vì bình luận có cấu trúc cây lồng nhau vô hạn,
 * việc duyệt đệ quy giúp tìm chính xác bình luận đích để thêm replies mới ở bất cứ cấp độ nào.
 */
export function addReplyRecursive(
  comments: Comment[],
  targetId: string,
  newReply: Comment
): Comment[] {
  return comments.map((c) => {
    if (c.id === targetId) {
      return {
        ...c,
        replies: [newReply, ...(c.replies || [])],
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: addReplyRecursive(c.replies, targetId, newReply),
      }
    }
    return c
  })
}

/**
 * Chỉnh sửa nội dung và ảnh của một bình luận có targetId trong cây bình luận.
 * TẠI SAO dùng đệ quy: Đảm bảo chỉnh sửa được áp dụng cho cả bình luận cha
 * lẫn các reply lồng sâu bên trong một cách an toàn và đúng cấu trúc.
 */
export function editCommentRecursive(
  comments: Comment[],
  targetId: string,
  newText: string,
  images?: string[]
): Comment[] {
  return comments.map((c) => {
    if (c.id === targetId) {
      return {
        ...c,
        content: newText,
        images: images,
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: editCommentRecursive(
          c.replies,
          targetId,
          newText,
          images
        ),
      }
    }
    return c
  })
}

/**
 * Xóa một bình luận/reply khỏi cây dựa trên targetId.
 * TẠI SAO dùng đệ quy: Duyệt qua toàn bộ cây bình luận và loại bỏ bình luận đích
 * ở bất kỳ cấp độ nào mà không làm gián đoạn liên kết các nút anh em khác.
 */
export function deleteCommentRecursive(
  comments: Comment[],
  targetId: string
): Comment[] {
  return comments
    .filter((c) => c.id !== targetId)
    .map((c) => {
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: deleteCommentRecursive(c.replies, targetId),
        }
      }
      return c
    })
}

/**
 * Cập nhật số lượt bình chọn hữu ích (helpfulCount) và trạng thái hasVoted trong cây bình luận.
 * TẠI SAO dùng đệ quy: Giúp đảo trạng thái helpful cho comment đích ở bất kỳ độ sâu nào,
 * giữ tính toàn vẹn dữ liệu cho toàn bộ thread bình luận.
 */
export function helpfulCommentRecursive(
  comments: Comment[],
  targetId: string
): Comment[] {
  return comments.map((c) => {
    if (c.id === targetId) {
      const wasVoted = c.hasVoted
      return {
        ...c,
        helpfulCount: wasVoted
          ? c.helpfulCount - 1
          : c.helpfulCount + 1,
        hasVoted: !wasVoted,
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: helpfulCommentRecursive(c.replies, targetId),
      }
    }
    return c
  })
}

/**
 * Tìm kiếm đệ quy bình luận theo ID trong cây bình luận lồng nhau vô hạn.
 * TẠI SAO dùng đệ quy: Hỗ trợ việc lấy tên tác giả của bình luận cha làm thông tin tag replyTo khi gửi phản hồi nhanh.
 */
export function findCommentByIdRecursive(
  comments: Comment[],
  id: string
): Comment | null {
  for (const c of comments) {
    if (c.id === id) return c
    if (c.replies && c.replies.length > 0) {
      const found = findCommentByIdRecursive(c.replies, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Tạo hiệu ứng pháo giấy bung nở xung quanh nút bấm khi người dùng nhấn Helpful.
 * TẠI SAO dùng cách này: Tạo hiệu ứng thị giác Premium Cinematic mà không cần
 * import thêm thư viện bên ngoài nặng nề, hoàn toàn bằng CSS Animation động tạo trực tiếp.
 */
export function triggerConfettiBurst(btn: HTMLElement, e: React.MouseEvent) {
  const COLORS = [
    "#ff4d6d", // Hồng ruby
    "#fbbf24", // Vàng hổ phách
    "#60a5fa", // Xanh ngọc
    "#34d399", // Xanh lục ngọc
    "#a78bfa", // Tím oải hương
    "#f472b6", // Hồng phấn
  ]
  // TẠI SAO giảm N và DURATION, thu nhỏ phạm vi bay:
  // 24 hạt với 1.5s cho cảm giác pháo hoa nhanh nhẹn, gọn đẹp — đủ hấp dẫn mà không kéo dài lê thê.
  // Phạm vi bay co lại (30-60px) và được cô lập bằng cách chèn trực tiếp vào nút btn (thay vì parent flex),
  // giúp triệt tiêu hoàn toàn sự xô lệch hay giật nảy layout của các phần tử bên cạnh (VD: nút Reply).
  const N = 24
  const DURATION = 2 // 2 giây — nhanh và đẹp, tự mờ dần biến mất

  const rect = btn.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top

  const stylesToCleanup: HTMLStyleElement[] = []
  const elementsToCleanup: HTMLDivElement[] = []

  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.5 // Tán góc đều quanh tâm
    const dist = 50 + Math.random() * 30 // Phạm vi co lại (30px - 60px) cho cảm giác gọn đẹp bên trong nút
    const tx = Math.cos(angle) * dist
    const ty = Math.sin(angle) * dist

    // Sinh góc xoay 3D ban đầu và lúc kết thúc ngẫu nhiên
    const rx1 = Math.random() * 360
    const ry1 = Math.random() * 360
    const rz1 = Math.random() * 360
    const rx2 = rx1 + (Math.random() > 0.5 ? 360 : -360) * (1 + Math.random())
    const ry2 = ry1 + (Math.random() > 0.5 ? 360 : -360) * (1 + Math.random())
    const rz2 = rz1 + (Math.random() > 0.5 ? 360 : -360) * (1 + Math.random())

    // Inject keyframes động cho hạt pháo hoa thứ i
    const kf = document.createElement("style")
    const animName = `confetti-burst-${i}-${Math.random().toString(36).slice(2, 6)}`

    // TẠI SAO chỉ dùng 2 keyframe 0% và 100% không có mốc giữa:
    // Trình duyệt tự nội suy tuyến tính opacity từ 1 → 0 và transform đồng thời,
    // tạo hiệu ứng pháo hoa mờ dần biến mất ngay tại chỗ — không có hành động rơi xuống giả tạo.
    kf.textContent = `
      @keyframes ${animName} {
        0% {
          transform: translate(-50%, -50%) scale(1) rotateX(${rx1}deg) rotateY(${ry1}deg) rotateZ(${rz1}deg);
          opacity: 1;
        }
        100% {
          transform: translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0) rotateX(${rx2}deg) rotateY(${ry2}deg) rotateZ(${rz2}deg);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(kf)
    stylesToCleanup.push(kf)

    const el = document.createElement("div")
    const shapeType = i % 4 // 0: Tròn, 1: Vuông, 2: Dải dẹt, 3: Tam giác

    let shapeStyles = ""
    const size = 3 + Math.random() * 5 // Kích cỡ ngẫu nhiên từ 3px đến 8px để gọn gàng hơn trong button

    if (shapeType === 0) {
      shapeStyles = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
      `
    } else if (shapeType === 1) {
      shapeStyles = `
        width: ${size}px;
        height: ${size}px;
      `
    } else if (shapeType === 2) {
      shapeStyles = `
        width: ${size * 1.5}px;
        height: ${size * 0.45}px;
      `
    } else {
      shapeStyles = `
        width: ${size}px;
        height: ${size}px;
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      `
    }

    // TẠI SAO đặt z-index: -1:
    // Confetti sẽ bay ở phía dưới text của nút Helpful để không che lấp chữ,
    // mang lại cấu trúc lớp lớp (Cinematic Layering) cao cấp.
    el.style.cssText = `
      position: absolute;
      top: ${clickY}px;
      left: ${clickX}px;
      background: ${COLORS[i % COLORS.length]};
      animation: ${animName} ${DURATION}s cubic-bezier(0.215, 0.610, 0.355, 1) forwards;
      pointer-events: none;
      z-index: -1;
      ${shapeStyles}
    `

    btn.appendChild(el)
    elementsToCleanup.push(el)
  }

  setTimeout(
    () => {
      elementsToCleanup.forEach((el) => el.remove())
      stylesToCleanup.forEach((kf) => kf.remove())
    },
    DURATION * 1000 + 100
  )
}
