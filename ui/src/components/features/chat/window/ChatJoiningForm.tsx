"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Combobox } from "@/components/ui/Combobox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import { useNationalities } from "@/hooks/useNationalities";
import { useTranslations } from "next-intl";

interface ChatJoiningFormProps {
    greeting: string;
    userName: string;
    isJoining: boolean;
    onUserNameChange: (name: string) => void;
    onJoin: (opts?: {
        nationality?: string;
        visaInterest?: string;
    }) => Promise<void>;
    nameInputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Form nhập thông tin trước khi bắt đầu cuộc hội thoại (Tên, Quốc tịch, Nhu cầu hỗ trợ).
 * TẠI SAO: Đóng gói toàn bộ form và các UI control phức tạp (Combobox, Select) giúp tối ưu hóa render và giảm bớt gánh nặng code cho ChatWindow chính.
 */
export function ChatJoiningForm({
    greeting,
    userName,
    isJoining,
    onUserNameChange,
    onJoin,
    nameInputRef,
}: ChatJoiningFormProps) {
    const [nationality, setNationality] = React.useState("");
    const [visaInterest, setVisaInterest] = React.useState<string>("");
    const NATIONALITY_COMBOBOX_OPTIONS = useNationalities();
    const t = useTranslations("ChatForm");

    const handleJoin = () => {
        void onJoin({
            nationality: nationality || undefined,
            visaInterest: visaInterest || undefined,
        });
    };

    return (
        <div className="flex flex-1 flex-col justify-center gap-4 overflow-visible p-4">
            <div className="text-center">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {greeting}! 👋
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t("desc")}
                </p>
            </div>

            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label
                        htmlFor="chat-user-name"
                        className="text-xs font-medium text-[var(--color-text-primary)]"
                    >
                        {t("label_name")}
                    </label>
                    <Input
                        ref={nameInputRef}
                        id="chat-user-name"
                        value={userName}
                        onChange={(e) => onUserNameChange(e.target.value)}
                        placeholder={t("placeholder_name")}
                        autoComplete="off"
                    />
                </div>

                <div className="space-y-1.5">
                    <label
                        id="chat-nationality-label"
                        className="text-xs font-medium text-[var(--color-text-primary)]"
                    >
                        {t("label_nationality")}
                    </label>
                    <Combobox
                        value={nationality}
                        onValueChange={setNationality}
                        options={NATIONALITY_COMBOBOX_OPTIONS}
                        placeholder={t("placeholder_nationality")}
                        emptyText={t("empty_nationality")}
                        className="w-full"
                    />
                </div>

                <div className="space-y-1.5">
                    <label
                        id="chat-visa-interest-label"
                        className="text-xs font-medium text-[var(--color-text-primary)]"
                    >
                        {t("label_interest")}
                    </label>
                    <Select
                        value={visaInterest}
                        onValueChange={setVisaInterest}
                    >
                        <SelectTrigger className="w-full rounded-xl border border-(--color-border-strong) bg-(--color-surface-1) px-4 text-sm font-semibold text-(--color-text-primary) h-10 transition-all flex items-center justify-between shadow-2xs hover:border-(--color-primary)/50 focus:outline-none focus:ring-2 focus:ring-(--color-primary)/20 focus:border-(--color-primary) focus:ring-offset-0 focus:hover:border-(--color-primary) data-[state=open]:ring-2 data-[state=open]:ring-(--color-primary)/20 data-[state=open]:border-(--color-primary) data-[state=open]:hover:border-(--color-primary)">
                            <SelectValue placeholder={t("placeholder_interest")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="E_VISA">
                                {t("opt_evisa")}
                            </SelectItem>
                            <SelectItem value="VOA">
                                {t("opt_voa")}
                            </SelectItem>
                            <SelectItem value="STATUS_CHECK">
                                {t("opt_check")}
                            </SelectItem>
                            <SelectItem value="URGENT">
                                {t("opt_urgent")}
                            </SelectItem>
                            <SelectItem value="OTHER">
                                {t("opt_other")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button
                type="button"
                data-testid="chat-join-submit"
                onClick={handleJoin}
                disabled={isJoining || userName.trim() === ""}
                isLoading={isJoining}
                className="w-full"
            >
                {t("btn_start")}
            </Button>
        </div>
    );
}
