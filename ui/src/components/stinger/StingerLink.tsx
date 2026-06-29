"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useStinger } from "@/hooks/useStinger";

type LinkProps = React.ComponentProps<typeof Link>;

/**
 * StingerLink - Bọc ngoài next/link, chặn thao tác nhảy trang tức thì
 * để phát màn hình chờ Stinger, giúp che giấu quá trình tải trang (Layout Shift).
 */
export function StingerLink({ children, href, onClick, ...props }: LinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { triggerStinger } = useStinger();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    // Luôn chạy onClick gốc nếu có (như tắt mobile menu, scrollTo top...)
    if (onClick) {
      onClick(e);
    }

    // Bỏ qua nếu người dùng mở tab mới (Ctrl/Cmd/Shift + click)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    // Bỏ qua nếu đây là link ngoại lai
    const targetUrl = typeof href === "string" ? href : href.pathname || "";
    if (targetUrl.startsWith("http")) return;

    // Bỏ qua nếu đang click lại chính trang hiện tại
    if (pathname === targetUrl) return;

    // Ngăn hành vi chuyển trang mặc định, kích hoạt Stinger
    e.preventDefault();
    triggerStinger(async () => {
      router.push(targetUrl);
      // Reset vị trí cuộn về đầu trang ngay trong lúc Stinger đang che màn hình
      // Điều này ngăn ngừa tính năng Scroll Restoration của Next.js cuộn sai vị trí
      window.scrollTo(0, 0);
    });
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
