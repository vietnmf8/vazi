import { useLocale } from "next-intl";
import { useMemo, useEffect } from "react";
import React from "react";
import { getFlagCdnUrl, COUNTRY_ISO_MAP } from "@/lib/flagcdn";
import { getFlagUrl } from "@/components/sections/nationalities/data";
import { type ComboboxOption } from "@/components/ui/Combobox";
import type { Nationality } from "@/lib/api/home.api";

const LOADED_FLAGS_CACHE = new Set<string>();

export function useNationalities(apiNationalities?: Nationality[]) {
    const locale = useLocale();

    useEffect(() => {
        if (typeof window === "undefined") return;
        Object.keys(COUNTRY_ISO_MAP).forEach((englishName) => {
            const src = getFlagCdnUrl(englishName);
            if (!LOADED_FLAGS_CACHE.has(src)) {
                const img = new window.Image();
                img.onload = () => {
                    LOADED_FLAGS_CACHE.add(src);
                };
                img.src = src;
            }
        });
    }, []);

    return useMemo(() => {
        const displayNames = new Intl.DisplayNames([locale], { type: "region" });
        const groups = new Map<string, Array<{name: string, englishName: string}>>();

        // Create localized list
        for (const [englishName, code] of Object.entries(COUNTRY_ISO_MAP)) {
            let localizedName = englishName;
            try {
                localizedName = displayNames.of(code.toUpperCase()) || englishName;
            } catch (e) {
                // Ignore
            }

            // Check if there is a custom name from API
            const apiMatch = apiNationalities?.find(n => n.code.toLowerCase() === code.toLowerCase());
            if (apiMatch && apiMatch.name !== englishName) {
                localizedName = apiMatch.name;
            }

            const letter = localizedName[0].toUpperCase();
            if (!groups.has(letter)) groups.set(letter, []);
            groups.get(letter)!.push({ name: localizedName, englishName });
        }

        const sortedLetters = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, locale));

        const result: ComboboxOption[] = [];
        for (const letter of sortedLetters) {
            result.push({
                value: `__header_${letter}`,
                label: letter,
                isHeader: true,
            });

            const names = groups.get(letter)!.sort((a, b) => a.name.localeCompare(b.name, locale));

            for (const { name, englishName } of names) {
                result.push({
                    value: englishName,
                    label: name,
                    icon: React.createElement("img", {
                        src: getFlagUrl(name, COUNTRY_ISO_MAP[englishName as keyof typeof COUNTRY_ISO_MAP] || ""),
                        className: "w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0",
                        alt: "",
                    }),
                });
            }
        }
        return result;
    }, [locale, apiNationalities]);
}
