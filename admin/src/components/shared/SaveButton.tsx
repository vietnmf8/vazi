"use client";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

// TẠI SAO: Kế thừa từ ButtonProps thay vì ButtonHTMLAttributes<HTMLButtonElement>
// để tự động hỗ trợ các thuộc tính của Button (như variant, size) mà không cần định nghĩa thủ công,
// giúp TypeScript kiểm lỗi chính xác khi các thành phần khác truyền prop size="sm".
interface SaveButtonProps extends ButtonProps {
    isLoading?: boolean;
    label?: string;
}

export function SaveButton({ isLoading, disabled, label, ...props }: SaveButtonProps) {
    return (
        <Button
            {...props}
            disabled={disabled || isLoading}
            style={{ backgroundColor: "#2563eb", color: "#fff", borderColor: "#2563eb", ...props.style }}
            className={`disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ""}`}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {label || t("common.save")}
        </Button>
    );
}

