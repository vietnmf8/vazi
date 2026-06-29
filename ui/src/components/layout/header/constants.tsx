import * as React from "react"
import type { ComboboxOption } from "@/components/ui/Combobox"
import { getFlagUrl } from "@/components/sections/FeaturedNationalities"

export type RegionOption = ComboboxOption & {
  locale: "en" | "vi" | "ko";
  offset: number;
  shortLabel: string;
  countryName: string;
};

/**
 * Danh sách cấu hình Quốc gia / Ngôn ngữ & Múi giờ.
 * TẠI SAO dùng danh sách này: Giúp hiển thị giờ địa phương trực quan theo từng khu vực,
 * đồng thời tích hợp tính năng đổi ngôn ngữ ngay trên cùng 1 Combobox.
 */
export const REGION_OPTIONS: RegionOption[] = [
  {
    value: "vn",
    label: "timezone_vietnam", // We will still use this translation key or maybe region_vietnam
    locale: "vi",
    offset: 7,
    shortLabel: "VN",
    countryName: "Vietnam",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("Vietnam")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "uk",
    label: "timezone_london",
    locale: "en",
    offset: 0,
    shortLabel: "UK",
    countryName: "United Kingdom",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("United Kingdom")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "us",
    label: "timezone_new_york",
    locale: "en",
    offset: -5,
    shortLabel: "US",
    countryName: "United States",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("United States")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "au",
    label: "timezone_sydney",
    locale: "en",
    offset: 10,
    shortLabel: "AU",
    countryName: "Australia",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("Australia")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "kr",
    label: "timezone_korea",
    locale: "ko",
    offset: 9,
    shortLabel: "KR",
    countryName: "South Korea",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("South Korea")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "jp",
    label: "timezone_japan",
    locale: "en",
    offset: 9,
    shortLabel: "JP",
    countryName: "Japan",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("Japan")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "cn",
    label: "timezone_china",
    locale: "en",
    offset: 8,
    shortLabel: "CN",
    countryName: "China",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("China")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "fr",
    label: "timezone_france",
    locale: "en",
    offset: 1,
    shortLabel: "FR",
    countryName: "France",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("France")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "de",
    label: "timezone_germany",
    locale: "en",
    offset: 1,
    shortLabel: "DE",
    countryName: "Germany",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("Germany")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
  {
    value: "es",
    label: "timezone_spain",
    locale: "en",
    offset: 1,
    shortLabel: "ES",
    countryName: "Spain",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getFlagUrl("Spain")}
        className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
        alt=""
      />
    ),
  },
]

/**
 * Link điều hướng chính của trang web.
 * TẠI SAO tách ra constant: Tránh lặp lại cấu trúc liên kết và giúp dễ dàng bảo trì,
 * đồng thời cho phép cả menu desktop và mobile drawer dùng chung 1 nguồn dữ liệu duy nhất.
 */
export const NAV_LINKS = [
  { label: "how_to_apply", href: "/how-to-apply" },
  { label: "visa_fees", href: "/guide/vietnam-visa-fees" },
  { label: "faqs", href: "/faqs" },
  { label: "about_us", href: "/about-us" },
  { label: "emergency_inquiry", href: "/emergency-inquiry" },
] as const

/**
 * Link điều hướng mở rộng (trong dấu ba chấm).
 */
export const ELLIPSIS_LINKS = [
  { label: "visa_extensions", href: "/guide/visa-extension" },
  { label: "visa_exemption_rules", href: "/guide/visa-exemptions" },
  { label: "extra_services", href: "/guide/extra-services" },
  { label: "payment_guideline", href: "/guide/payment-guideline" },
] as const

export const MOBILE_NAV_ID = "mobile-main-navigation"
