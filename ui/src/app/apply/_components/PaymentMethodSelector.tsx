"use client";

import Image from "next/image";
import CheckIcon from "@/assets/icons/ui/Check.svg";
import CreditCardIcon from "@/assets/icons/ui/CreditCard.svg";

/**
 * Khối hiển thị và chọn lựa phương thức thanh toán (PayPal, Credit Card sắp hỗ trợ).
 */
export function PaymentMethodSelector() {
    return (
        <div className="space-y-4">
            <h3 className="section-label text-(--color-primary)">
                Payment Method
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {/* Cổng PayPal — đang kích hoạt mặc định */}
                <div
                    className="relative flex cursor-default flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[rgba(200,150,90,0.6)] bg-[var(--color-primary-subtle)] p-5 shadow-[0_0_0_1px_rgba(200,150,90,0.3)]"
                    aria-current="true"
                >
                    {/* Tick đã chọn */}
                    <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[var(--color-primary)]">
                        <CheckIcon className="size-3 text-[var(--color-text-inverse)]" aria-hidden="true" />
                    </span>

                    {/* Logo PayPal từ file ảnh */}
                    <Image
                        src="/PayPal.png"
                        alt="PayPal"
                        width={80}
                        height={21}
                        className="object-contain"
                        style={{ height: "auto", width: "auto" }}
                        priority
                    />
                    <span className="font-body text-sm font-semibold text-[var(--color-text-primary)]">
                        PayPal
                    </span>
                </div>

                {/* Cổng thẻ tín dụng Credit Card — sắp hỗ trợ */}
                <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 opacity-40">
                    <CreditCardIcon className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
                    <span className="font-body text-sm font-semibold text-[var(--color-text-muted)]">
                        Credit Card
                    </span>
                    <span className="rounded-full bg-[var(--color-surface-3)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                        Coming soon
                    </span>
                </div>
            </div>
            <p className="text-sm text-(--color-text-muted)">
                You will be redirected to PayPal to complete payment securely.
            </p>
        </div>
    );
}
