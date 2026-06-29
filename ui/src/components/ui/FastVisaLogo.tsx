"use client";

import React from "react";
import FastVisaLogoIcon from "@/assets/icons/ui/FastVisaLogo.svg";

// Định nghĩa kiểu dữ liệu cho props của Logo Component nhằm tuân thủ TypeScript strict mode
interface FastVisaLogoProps {
    className?: string;
    width?: number | string;
    height?: number | string;
}

/**
 * Component hiển thị Logo FastVisa dưới dạng SVG inline.
 * TẠI SAO dùng SVG inline thay vì import file .svg trực tiếp?
 * 1. Đảm bảo tính tương thích 100% với Next.js 16, Turbopack và React Compiler mà không cần cấu hình thêm webpack.
 * 2. Cho phép kiểm soát động kích thước, màu sắc và áp dụng các thuộc tính CSS/Tailwind mượt mà.
 */
export default function FastVisaLogo({
    className = "",
    width = 93,
    height = 93,
}: FastVisaLogoProps) {
    return (
        <FastVisaLogoIcon
            id="fastvisa-logo"
            width={width}
            height={height}
            className={`select-none ${className}`}
        />
    );
}
