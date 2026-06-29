"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEntryGate } from "@/components/features/entry-gate/EntryGateContext";
import { StingerLink } from "@/components/stinger/StingerLink";
import {
  Menu,
  X,
  Mail,
  Sun,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/Combobox";
import { getFlagUrl } from "@/components/sections/FeaturedNationalities";
import { ThemeToggler } from "animate-ui/components/buttons/theme-toggler";
import WhatsappIcon from "@/assets/icons/social/WhatsAppAlt.svg";
import { useTranslations, useLocale } from "next-intl";
import { REGION_OPTIONS, MOBILE_NAV_ID } from "./header/constants";

const LOCALE_TO_REGION: Record<string, string> = { vi: "vn", ko: "kr", en: "us" };
import { HeaderNavDesktop } from "./header/HeaderNavDesktop";
import { HeaderNavMobile } from "./header/HeaderNavMobile";
import { RegionSelectorButton } from "./header/RegionSelectorButton";
import { RegionSelectorModal } from "./header/RegionSelectorModal";
import { useStinger } from "@/hooks/useStinger";
import { WHATSAPP_URL } from "@/lib/constants";

import type { NavLink } from "@/lib/api/footer.api";

interface HeaderProps {
  whatsappUrl?: string;
  email?: string;
  hotline?: string;
  headerNav?: NavLink[];
}

/**
 * Header toàn site — sticky glassmorphism, auto-hide khi scroll xuống trên mobile.
 * Redesign Phase 5: Modern 2026 Travel design system.
 */
export function Header({
  whatsappUrl = WHATSAPP_URL,
  email = "zavi@gmail.com",
  hotline = "+84.96.5800.392",
  headerNav = [],
}: HeaderProps = {}) {
  const tHeader = useTranslations("Header");
  const tNav = useTranslations("Navigation");
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const { openGate } = useEntryGate();
  const { triggerStinger } = useStinger();
  const resolveTransitionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isPending && resolveTransitionRef.current) {
      resolveTransitionRef.current();
      resolveTransitionRef.current = null;
    }
  }, [isPending]);

  // TẠI SAO: Cho phép cuộn mượt lên trên cùng khi nhấn vào logo nếu người dùng 
  // đang ở chính trang chủ, thay vì tải lại toàn bộ trang web.
  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /**
   * Kích hoạt hiển thị Entry Gate Modal khi click vào Apply Now trên Header.
   * TẠI SAO: Click ở Header là luồng vãng lai (marketing), do đó cần hiển thị đầy đủ cả 3 lựa chọn.
   */
  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openGate({
      hideFastTrack: false, // Hiện đầy đủ 3 tùy chọn
      onConfirmNew: () => {
        router.push("/apply");
      },
      onConfirmUrgent: () => {
        router.push("/emergency-inquiry");
      },
      onConfirmFastTrack: () => {
        router.push("/apply?category=evisa-code&option=basic-fasttrack&vip=false&step=2");
      }
    });
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  // Hiện border-bottom sau khi scroll 60px
  const [isScrolled, setIsScrolled] = useState(false);
  // Ẩn header lúc đầu trên trang chủ (cinematic hero), hiện khi scroll > 80px
  const [isHomepageHidden, setIsHomepageHidden] = useState(pathname === "/");
  const lastScrollY = useRef(0);

  const [mounted, setMounted] = useState(false);
  // Theme states & logic
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    const raf = requestAnimationFrame(() => {
      setTheme(initialTheme);
      setMounted(true);
      if (initialTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // TẠI SAO: Đổi theme lập tức, chặn đứng transition màu chuyển động chậm trên Header/Section.
  // Chèn thẻ style chặn tạm thời, cập nhật class ở HTML, force reflow vẽ lại ngay lập tức, rồi tháo ra.
  const toggleTheme = () => {
    const css = document.createElement("style");
    css.type = "text/css";
    css.appendChild(
      document.createTextNode(
        `*, *::before, *::after {
           -webkit-transition: none !important;
           -moz-transition: none !important;
           -o-transition: none !important;
           -ms-transition: none !important;
           transition: none !important;
        }`
      )
    );
    document.head.appendChild(css);

    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // TẠI SAO: Đọc offsetHeight từ document.body buộc trình duyệt phải recalculate styles và 
    // thực hiện reflow toàn bộ layout/variables của trang ngay lập tức khi style chặn transition 
    // vẫn đang hoạt động. Điều này khắc phục triệt để lỗi thanh Header bị trễ nhịp đổi màu (flicker).
    const _ = document.body.offsetHeight;

    // TẠI SAO dùng setTimeout 150ms thay vì double requestAnimationFrame:
    // Đảm bảo vượt qua hoàn toàn chu kỳ re-render của React và paint của trình duyệt, đặc biệt là 
    // trên các màn hình gaming tần số quét cao (144Hz/240Hz của Legion) nơi double RAF trôi qua 
    // quá nhanh (chỉ ~8-12ms) không đủ để React commit DOM xong. Việc giữ style chặn lâu hơn 
    // một chút (~150ms) giúp Header và tất cả các class transition của nó đổi màu đột ngột hoàn hảo.
    setTimeout(() => {
      if (css.parentNode) {
        document.head.removeChild(css);
      }
    }, 150);
  };

  // Region & Clock state variables
  const locale = useLocale();
  const defaultRegion = LOCALE_TO_REGION[locale] ?? "vn";

  // selectedRegion: dùng cho RegionSelectorButton (ngôn ngữ)
  const [selectedRegion, setSelectedRegion] = useState(defaultRegion);
  // selectedTimezone: dùng cho Combobox + clock (múi giờ hiển thị)
  const [selectedTimezone, setSelectedTimezone] = useState(defaultRegion);
  const [timeStr, setTimeStr] = useState("");
  const [isTimezoneOpen, setIsTimezoneOpen] = useState(false);

  const offset = REGION_OPTIONS.find(r => r.value === selectedTimezone)?.offset || 7;

  // Chỉ cập nhật vùng/múi giờ hiển thị, không đổi ngôn ngữ
  const handleTimezoneChange = (val: string) => {
    setSelectedTimezone(val);
  };

  // Đổi ngôn ngữ toàn site kèm stinger animation
  const handleLanguageChange = (val: string) => {
    const selectedLocale = REGION_OPTIONS.find(r => r.value === val)?.locale || "en";
    triggerStinger(() => {
      return new Promise<void>((resolve) => {
        setSelectedRegion(val);
        setSelectedTimezone(val);
        setIsRegionModalOpen(false);
        const cleanResolve = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        resolveTransitionRef.current = cleanResolve;
        const timeoutId = setTimeout(() => {
          if (resolveTransitionRef.current === cleanResolve) {
            cleanResolve();
            resolveTransitionRef.current = null;
          }
        }, 2500);
        startTransition(() => {
          document.cookie = `NEXT_LOCALE=${selectedLocale}; path=/; max-age=31536000; SameSite=Lax`;
          router.refresh();
        });
      });
    });
  };

  // Timezone clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const targetTime = new Date(utc + offset * 3600000);

      // Loại bỏ giây để chuỗi thời gian gọn hơn, tránh bị rớt xuống 2 dòng trên màn hình hẹp
      const formatted = targetTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const dateFormatted = targetTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      setTimeStr(`${dateFormatted}, ${formatted} (GMT${offset >= 0 ? "+" + offset : offset})`);
    };

    updateTime();
    // Tăng khoảng thời gian cập nhật lên 10 giây vì không còn hiển thị giây nữa, tối ưu hóa CPU/GPU
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [offset]);

  // Đóng mobile menu khi route thay đổi, reset homepage-hidden khi rời /
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    setIsHomepageHidden(pathname === "/");
  }

    useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;

      // Bật border-bottom sau scroll 60px
      setIsScrolled(currentScrollY > 60);

      // Hiện header trên trang chủ sau khi scroll > 80px (chỉ hiện, không ẩn lại)
      if (pathname === "/") {
        if (currentScrollY > 80) {
          setIsHomepageHidden(false);
        }
      }

      if (!isMobile) {
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 64) {
        setIsHidden(true);
        setIsMobileMenuOpen(false);
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, isHomepageHidden]);

  const isActive = (href: string) => {
    if (href === "/guide" && pathname === "/guide/vietnam-visa-fees") {
      return false;
    }
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  };

  // Desktop nav link — gold bottom border khi active
  const navLinkClass = (href: string) =>
    cn(
      "relative text-sm font-medium tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm decoration-none",
      "font-[family-name:var(--font-family-heading)]",
      isActive(href)
        ? "text-(--color-text-primary) border-b-2 border-[var(--color-primary)] pb-0.5"
        : "text-(--color-text-secondary) hover:text-(--color-text-primary) transition-all"
    );

  // TẠI SAO: Xác định thiết bị Desktop dựa trên media query sau khi đã mount ở Client
  // để tránh lỗi Hydration mismatch giữa Server và Client, đồng thời phục vụ cho việc
  // tắt hiệu ứng ẩn Cinematic Header trên Mobile.
  const isDesktop = mounted ? !window.matchMedia("(max-width: 767px)").matches : true;

  return (
    <div
      suppressHydrationWarning
      aria-hidden={isHomepageHidden && isDesktop ? true : undefined}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isHidden && "-translate-y-full md:translate-y-0",
        isHomepageHidden && "md:opacity-0 md:-translate-y-2 md:pointer-events-none"
      )}
    >
      {/* ── Top Utility Bar (Clock & Contact details) ── */}
      <div
        className="hidden md:block border-b border-[var(--color-border)]"
        style={{
          background: "var(--color-surface-glass)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="w-full flex flex-row items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 py-2 overflow-x-auto select-no-scrollbar">
          {/* Timezone Dropdown + Clock */}
          <div className="flex items-center gap-3 text-sm shrink-0" suppressHydrationWarning>
            {!mounted ? (
              /* 
                Thiết kế placeholder tĩnh w-56 có kích thước, cờ tròn xoe, font-size và border 
                đồng bộ 100% với Combobox khi chưa được client mount để tránh hiện tượng giật layout
              */
              <div className="h-10 w-56 rounded-xl border border-(--color-border-strong) bg-(--color-surface-1) px-3 flex items-center gap-2.5 text-sm font-semibold text-(--color-text-primary) shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFlagUrl("Vietnam")}
                  className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0 mr-1.5"
                  alt=""
                />
                <span className="truncate">{tNav("timezone_vietnam")}</span>
              </div>
            ) : (
              <>
                <Combobox
                  open={isTimezoneOpen}
                  onOpenChange={setIsTimezoneOpen}
                  value={selectedTimezone}
                  onValueChange={handleTimezoneChange}
                  options={REGION_OPTIONS.map(opt => ({ ...opt, label: tNav(opt.label as any) }))}
                  placeholder={tHeader("select_timezone")}
                  className="w-56"
                  syncLabelWithLanguage
                />
                <div
                  id="datetime"
                  suppressHydrationWarning
                  className="h-10 px-4 flex items-center justify-center text-sm text-[var(--color-primary)] font-[family-name:var(--font-family-mono)] font-bold tracking-tight border border-[rgba(217,119,6,0.15)] rounded-xl whitespace-nowrap"
                  style={{
                    background: "var(--color-primary-subtle)",
                  }}
                >
                  {timeStr}
                </div>
              </>
            )}
          </div>

          {/* Contact Details */}
          <div className="flex items-center gap-3 sm:gap-4 text-sm text-[var(--color-text-muted)] flex-nowrap shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 font-bold transition-all whitespace-nowrap decoration-none"
            >
              <WhatsappIcon className="size-3 fill-current text-[var(--color-primary)]" />
              {tHeader("whatsapp_priority")} {hotline}
            </a>
            <span className="hidden sm:inline opacity-30">|</span>
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-1 hover:text-(--color-text-primary) transition-all whitespace-nowrap decoration-none"
            >
              <Mail className="size-3" />
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Header Menu Bar — Glassmorphism ── */}
      <header
        role="banner"
        data-ai-id="header"
        data-ai-desc="Thanh điều hướng chính của trang"
        className={cn(
          "transition-all duration-300",
          isScrolled ? "border-b border-[var(--color-border)]" : "border-b border-transparent"
        )}
        style={{
          background: "var(--color-surface-glass)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex h-15 md:h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <StingerLink
            href="/"
            onClick={handleLogoClick}
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm"
            aria-label="VietnamEVisa — Home"
          >
            <div className="relative h-[52px] flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-lm.png"
                alt="VietnamEVisa Logo"
                className="block dark:hidden h-[52px] w-auto object-contain animate-none"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-dm.png"
                alt="VietnamEVisa Logo"
                className="hidden dark:block h-[52px] w-auto object-contain animate-none"
              />
            </div>
          </StingerLink>

          {/* Desktop Navigation Subcomponent */}
          <HeaderNavDesktop isActive={isActive} navLinkClass={navLinkClass} headerNav={headerNav} />

          {/* Desktop CTA Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            {!mounted ? (
              <>
                <div className="h-10 w-[84px] rounded-xl bg-stone-200/80 border border-stone-300 px-3 flex items-center gap-2 select-none shrink-0 shadow-2xs">
                  <div className="w-5 h-5 rounded-full bg-stone-300 shrink-0" />
                  <div className="w-6 h-3 bg-stone-300 rounded" />
                </div>
                <div className="w-14 h-8 rounded-full bg-stone-200/80 border border-stone-300 p-1 flex items-center select-none shrink-0">
                  <div className="w-5.5 h-5.5 rounded-full bg-white flex items-center justify-center text-stone-600 shadow-xs">
                    <Sun className="size-3 fill-current" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <RegionSelectorButton
                  selectedRegion={selectedRegion}
                  onClick={() => setIsRegionModalOpen(true)}
                />
                <ThemeToggler theme={theme} toggleTheme={toggleTheme} />
              </>
            )}

            <StingerLink
              href="/check-status"
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "lg",
                }),
                "rounded-full font-semibold border-[var(--color-border-strong)] px-6 decoration-none",
                isActive("/check-status") &&
                  "text-[var(--color-primary)] border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
              )}
              aria-current={isActive("/check-status") ? "page" : undefined}
              data-ai-element="header_check_status"
            >
              {tHeader("check_status")}
            </StingerLink>
            <button
              onClick={handleApplyClick}
              data-ai-element="btn-apply-header"
              className={cn(
                buttonVariants({
                  variant: "default",
                  size: "lg",
                }),
                "rounded-full px-6 decoration-none border-0"
              )}
            >
              {tHeader("apply_now")}
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-md text-(--color-text-primary) hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:hidden transition-all border-0 bg-transparent "
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls={MOBILE_NAV_ID}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            data-ai-element="header_mobile_menu"
          >
            {isMobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Drawer Subcomponent */}
        <HeaderNavMobile
          isMobileMenuOpen={isMobileMenuOpen}
          theme={theme}
          mounted={mounted}
          isActive={isActive}
          toggleTheme={toggleTheme}
          selectedRegion={selectedRegion}
          onOpenRegionModal={() => setIsRegionModalOpen(true)}
          headerNav={headerNav}
        />
      </header>

      <RegionSelectorModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        selectedRegion={selectedRegion}
        onRegionSelect={handleLanguageChange}
      />
    </div>
  );
}
