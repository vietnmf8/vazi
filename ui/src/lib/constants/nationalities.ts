import React from "react";
import { getFlagCdnUrl } from "@/lib/flagcdn";
import { type ComboboxOption } from "@/components/ui/Combobox";

export const COUNTRIES = [
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Bangladesh",
    "Belgium",
    "Brazil",
    "Bulgaria",
    "Cambodia",
    "Canada",
    "Chile",
    "China",
    "Colombia",
    "Croatia",
    "Czech Republic",
    "Denmark",
    "Egypt",
    "Estonia",
    "Finland",
    "France",
    "Georgia",
    "Germany",
    "Greece",
    "Hong Kong",
    "Hungary",
    "India",
    "Indonesia",
    "Iran",
    "Ireland",
    "Israel",
    "Italy",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kuwait",
    "Laos",
    "Latvia",
    "Lithuania",
    "Luxembourg",
    "Malaysia",
    "Mexico",
    "Mongolia",
    "Myanmar",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nigeria",
    "Norway",
    "Oman",
    "Pakistan",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Saudi Arabia",
    "Singapore",
    "Slovakia",
    "South Africa",
    "South Korea",
    "Spain",
    "Sri Lanka",
    "Sweden",
    "Switzerland",
    "Taiwan",
    "Thailand",
    "Turkey",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "United States",
    "Venezuela",
].sort((a, b) => a.localeCompare(b));

// Build options grouped A-Z with section headers
export const NATIONALITY_COMBOBOX_OPTIONS: ComboboxOption[] = (() => {
    const groups = new Map<string, string[]>();
    for (const name of COUNTRIES) {
        const letter = name[0].toUpperCase();
        if (!groups.has(letter)) groups.set(letter, []);
        groups.get(letter)!.push(name);
    }
    const result: ComboboxOption[] = [];
    for (const [letter, names] of groups) {
        result.push({
            value: `__header_${letter}`,
            label: letter,
            isHeader: true,
        });
        for (const name of names) {
            result.push({
                value: name,
                label: name,
                icon: React.createElement("img", {
                    src: getFlagCdnUrl(name),
                    className: "w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0",
                    alt: "",
                }),
            });
        }
    }
    return result;
})();
