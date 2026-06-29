import { useLocale } from "next-intl";
import { useMemo, useCallback } from "react";

export function useLocalizedCountryName() {
    const locale = useLocale();

    const displayNames = useMemo(() => {
        try {
            return new Intl.DisplayNames([locale], { type: "region" });
        } catch (error) {
            return null;
        }
    }, [locale]);

    const getLocalizedName = useCallback(
        (isoCode: string, fallbackName: string, isCustomNameFromApi?: boolean) => {
            // Nếu API chỉ định rõ đây là custom name, dùng luôn
            if (isCustomNameFromApi) return fallbackName;
            
            if (!displayNames) return fallbackName;
            try {
                // Kiểm tra xem fallbackName có phải là tên tiếng Anh chuẩn không
                // Vì database được seed bằng tiếng Anh chuẩn. 
                // Nếu Admin đã đổi tên (VD: "Canada" -> "Canade"), thì fallbackName sẽ khác standardEnName
                const standardEnName = new Intl.DisplayNames(["en"], { type: "region" }).of(isoCode.toUpperCase());
                
                if (standardEnName && fallbackName !== standardEnName) {
                    return fallbackName; // Đây là tên đã được Admin tùy chỉnh!
                }

                // Nếu là tên chuẩn (chưa bị đổi), ta mới dùng Intl.DisplayNames để dịch sang locale hiện tại
                return displayNames.of(isoCode.toUpperCase()) || fallbackName;
            } catch (error) {
                return fallbackName;
            }
        },
        [displayNames]
    );

    return { getLocalizedName, locale };
}
