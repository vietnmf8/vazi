import * as React from "react"
import type { ComboboxOption } from "@/components/ui/Combobox"

/**
 * Danh sách các quốc gia chuẩn ISO (mã 2 ký tự và tên đầy đủ).
 * TẠI SAO định nghĩa danh sách này: Giúp hiển thị danh sách trong Combobox và dễ dàng tải ảnh quốc kỳ tương ứng từ FlagCDN,
 * mang lại giao diện trực quan và chuyên nghiệp (Premium UI) cho khách du lịch toàn cầu khi gửi câu hỏi.
 */
export const COUNTRIES = [
  { code: "VN", name: "Vietnam" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "NZ", name: "New Zealand" },
  { code: "RU", name: "Russia" },
  { code: "CH", name: "Switzerland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "TH", name: "Thailand" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
]

/**
 * Danh sách COMBOBOX_OPTIONS kèm icon ảnh cờ bo tròn.
 * TẠI SAO xây dựng danh sách này: Ánh xạ trực tiếp từ mảng COUNTRIES sang cấu trúc ComboboxOption của Shadcn UI,
 * tự động tải ảnh quốc kỳ tròn siêu nhỏ từ FlagCDN giúp trải nghiệm chọn quốc gia (Country Selector)
 * trở nên trực quan sinh động và đẳng cấp hơn nhiều so với dropdown chữ đơn thuần.
 */
export const COMBOBOX_OPTIONS: ComboboxOption[] = COUNTRIES.map((c) => ({
  value: c.name,
  label: c.name,
  icon: (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
      alt={c.name}
      className="w-4 h-4 rounded-full object-cover shrink-0"
    />
  ),
}))

/**
 * Lấy mã ISO 2 ký tự của quốc gia từ tên đầy đủ.
 * TẠI SAO viết hàm này: Do trường nationality trong kiểu dữ liệu Comment lưu trữ tên đầy đủ của quốc gia (ví dụ "United States"),
 * ta cần tra cứu ngược lại mã ISO 2 ký tự của quốc gia đó để render đúng quốc kỳ siêu nhỏ từ FlagCDN.
 *
 * @param {string} name Tên đầy đủ của quốc gia
 * @returns {string} Mã quốc gia 2 ký tự (in thường), mặc định là "us" nếu không tìm thấy
 */
export const getCountryCode = (name: string): string => {
  const found = COUNTRIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  return found ? found.code.toLowerCase() : "us"
}
