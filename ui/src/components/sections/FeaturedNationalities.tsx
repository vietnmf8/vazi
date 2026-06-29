"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Ban } from "lucide-react";
import type { Nationality } from "@/types/api";
import { useTranslations } from "next-intl";

import { Combobox } from "@/components/ui/Combobox";
import { cn } from "@/lib/utils";

import { useFeaturedNationalities } from "./hooks/useFeaturedNationalities";
import { deriveExemptionInfo, getFlagUrl } from "./nationalities/data";
export { getFlagUrl };

import { LazyFlag, LOADED_FLAGS_CACHE } from "./nationalities/LazyFlag";
import {
  getDialogThemeClasses,
  NationalityDialogContent,
} from "./nationalities/NationalityDialog";

interface FeaturedNationalitiesProps {
  nationalities: Nationality[];
}

/**
 * FeaturedNationalities - Orchestrator quản lý tính năng kiểm tra điều kiện visa của các quốc gia.
 * Hỗ trợ hoạt ảnh lật 3D Card Cinematic từ vị trí click hoặc Dialog Scale Fade từ ô tìm kiếm.
 */
export function FeaturedNationalities({ nationalities }: FeaturedNationalitiesProps) {
  const t = useTranslations("HomePage.FeaturedNationalities");
  const {
    mounted,
    showMore,
    selectedCountry,
    setSelectedCountry,
    activeTab,
    setActiveTab,
    isOpenFromSearch,
    headingRef,
    extendedSectionRef,
    activeNat,
    setActiveNat,
    activeRect,
    targetW,
    targetH,
    targetT,
    targetL,
    handleToggleShowMore,
    handleTileClick,
    handleCheckRequirement,
    handleExitComplete,
    popularNats,
    filteredExtendedNats,
    goodCount,
    normalCount,
    blacklistCount,
    cardVariants,
    isLoading,
    nationalityOptions,
  } = useFeaturedNationalities(nationalities);

  const exemptionRule = activeNat ? deriveExemptionInfo(activeNat.group, activeNat.exemptionDays ?? 0) : null;



  return (
    <section
      id="nationalities"
      aria-labelledby="nationalities-heading"
      className="w-full border-y border-(--color-border-default) px-4 py-16 md:px-6 lg:px-8 reveal-on-scroll"
      suppressHydrationWarning
    >
      <div className="mx-auto max-w-7xl relative z-10">
        {/* Tiêu đề nằm riêng 1 hàng và căn giữa viewport */}
        <div className="text-center mb-6">
          <h2
            id="nationalities-heading"
            ref={headingRef}
            className="section-title text-center inline-block"
          >
            {t("title")}
          </h2>
        </div>

        {/* Form check được căn giữa viewport */}
        <div className="flex justify-center mb-10 w-full">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
            <div className="min-w-[320px] flex-1 sm:flex-initial">
              <Combobox
                value={selectedCountry}
                onValueChange={setSelectedCountry}
                options={nationalityOptions}
                placeholder={isLoading ? t("loading") : t("select")}
                emptyText={t("no_found")}
                disabled={isLoading}
                className="h-12"
                inputClassName="h-12"
                syncLabelWithLanguage
              />
            </div>
            <button
              onClick={() => handleCheckRequirement()}
              disabled={!selectedCountry}
              className="h-12 px-6 py-2.5 rounded-xl text-base font-bold bg-(--color-primary) text-white dark:text-black hover:bg-(--color-primary-dark) disabled:opacity-40 transition-all font-body shrink-0 border-0"
            >
              {t("check_btn")}
            </button>
          </div>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-6 list-none p-0 m-0">
          {popularNats.map((nat) => (
            <li key={nat.code}>
              <a
                href={nat.href}
                data-nat-card={nat.code}
                data-prevent-transition="true"
                data-ai-id={`card_nationality_${nat.code.toLowerCase()}`}
                data-ai-desc={`Thẻ thông tin visa của quốc gia ${nat.label}`}
                onClick={(e) => handleTileClick(e, nat)}
                className="group flex flex-col items-center gap-4 rounded-2xl border border-(--color-primary)/30 bg-amber-50/20 dark:bg-amber-950/20 p-7 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:bg-amber-50/50 dark:hover:bg-(--color-bg)/20 h-full"
              >
                <LazyFlag
                  countryName={nat.name || nat.label}
                  isoCode={nat.code}
                  fallbackFlag={nat.flag}
                  className="w-16 h-16 rounded-full shadow-sm  bg-stone-50 group-hover:scale-105 transition-transform duration-300 shrink-0"
                />
                <span className="text-sm font-bold text-(--color-text-secondary) group-hover:text-(--color-text-primary) transition-all font-heading">
                  {nat.label}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex justify-center mt-12 mb-8">
          <div className="flex items-center gap-1.5 p-1 bg-(--color-surface-2) border border-(--color-border) rounded-2xl shadow-xs relative">
            {(
              [
                {
                  id: "good" as const,
                  label: t("tab_good"),
                  count: goodCount,
                  badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
                  icon: CheckCircle2,
                },
                {
                  id: "normal" as const,
                  label: t("tab_normal"),
                  count: normalCount,
                  badge: "bg-amber-100 text-(--color-primary) dark:bg-amber-950/50",
                  icon: AlertTriangle,
                },
                {
                  id: "blacklist" as const,
                  label: t("tab_blacklist"),
                  count: blacklistCount,
                  badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400",
                  icon: Ban,
                },
              ]
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative px-5 py-2.5 rounded-xl text-sm font-bold font-heading transition-all flex items-center gap-3.5 border-0 bg-transparent",
                    isActive
                      ? "text-(--color-text-primary) shadow-sm"
                      : "text-(--color-text-muted) hover:text-(--color-text-primary) transition-all"
                  )}
                >
                  {isActive && (
                    <m.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-(--color-surface-1) border border-(--color-border-strong)/30 rounded-[inherit] z-0"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  {/* Tại sao: Hiển thị nhãn mô tả của tab trên màn hình từ kích thước sm trở lên để người dùng hiểu rõ ý nghĩa bộ lọc (Hỗ trợ tốt, Bán hỗ trợ, Không hỗ trợ), trong khi ẩn trên thiết bị di động nhằm tránh tràn bố cục và giữ giao diện tinh gọn. */}
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                  <span
                    className={cn(
                      "relative z-10 inline-flex items-center gap-1 text-sm px-2.5 py-0.5 rounded-full font-sans transition-all",
                      tab.badge
                    )}
                  >
                    <tab.icon className="size-3.5" aria-hidden="true" />
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <m.div
          ref={extendedSectionRef}
          animate={{
            height: showMore ? "auto" : 0,
            opacity: showMore ? 1 : 0,
          }}
          transition={{
            duration: 0.45,
            ease: [0.25, 1, 0.5, 1],
          }}
          style={{ willChange: "height, opacity" }}
          className="overflow-hidden relative w-full"
        >
          <div className="w-full pt-5">
            <div className="border-t border-(--color-border) pt-8 pb-6">
              <AnimatePresence mode="wait" initial={false}>
                <m.ul
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                  className="flex flex-wrap justify-center gap-4 w-full list-none p-0 m-0"
                >
                  {filteredExtendedNats.map((nat) => (
                    <li
                      key={nat.code}
                      className="w-[calc(50%-8px)] sm:w-[150px] md:w-[160px] shrink-0"
                    >
                      <a
                        href={nat.href}
                        data-nat-card={nat.code}
                        data-prevent-transition="true"
                        data-ai-id={`card_nationality_${nat.code.toLowerCase()}`}
                        data-ai-desc={`Thẻ thông tin visa của quốc gia ${nat.label}`}
                        onClick={(e) => handleTileClick(e, nat)}
                        className="group flex flex-col items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-1) p-4 text-center transition-all duration-300 hover:shadow-md hover:border-(--color-primary)/40 hover:-translate-y-0.5 h-full w-full"
                      >
                        <LazyFlag
                          countryName={nat.name || nat.label}
                          isoCode={nat.code}
                          fallbackFlag={nat.flag}
                          className="w-12 h-12 rounded-full shadow-xs border border-stone-200 bg-stone-50 group-hover:scale-105 transition-transform duration-300 shrink-0"
                        />
                        <span className="text-xs font-bold text-(--color-text-secondary) group-hover:text-(--color-text-primary) transition-all font-heading">
                          {nat.label}
                        </span>
                      </a>
                    </li>
                  ))}
                </m.ul>
              </AnimatePresence>
            </div>
          </div>
        </m.div>

        <div className="flex justify-center mt-10">
          <button
            onClick={handleToggleShowMore}
            data-ai-id="btn-see-more"
            data-ai-desc={showMore ? "Nút thu gọn danh sách quốc gia" : "Nút xem thêm danh sách các quốc gia khác"}
            className="h-12 px-6 rounded-full text-base font-bold border border-(--color-border-strong) text-(--color-text-primary) hover:bg-(--color-surface-2) font-heading shadow-sm flex items-center justify-center bg-transparent transition-all"
          >
            {showMore ? t("see_less") : t("see_more")}
          </button>
        </div>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence onExitComplete={handleExitComplete} custom={activeNat?.code}>
            {activeNat && exemptionRule && (
              <>
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-xs"
                  onClick={() => setActiveNat(null)}
                />

                {isOpenFromSearch ? (
                  <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
                    <m.div
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                        y: 15,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.95,
                        y: 15,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 340,
                        damping: 26,
                      }}
                      className={cn(
                        "w-full max-w-[500px] h-[540px] rounded-[28px] border shadow-2xl overflow-hidden pointer-events-auto relative transition-colors duration-300",
                        getDialogThemeClasses(activeNat.group)
                      )}
                    >
                      <NationalityDialogContent
                        nat={activeNat}
                        exemption={exemptionRule}
                        onClose={() => setActiveNat(null)}
                        targetW={500}
                        targetH={540}
                      />
                    </m.div>
                  </div>
                ) : (
                  <div className="fixed inset-0 z-[51] pointer-events-none" style={{ perspective: 1200 }}>
                    <m.div
                      custom={activeNat.code}
                      className="absolute pointer-events-auto"
                      style={{
                        transformStyle: "preserve-3d",
                      }}
                      variants={cardVariants}
                      initial={
                        activeRect
                          ? {
                              top: activeRect.top,
                              left: activeRect.left,
                              width: activeRect.width,
                              height: activeRect.height,
                              rotateY: 0,
                              borderRadius: activeNat.isPopular ? 16 : 12,
                            }
                          : {
                              top: targetT,
                              left: targetL,
                              width: targetW,
                              height: targetH,
                              rotateY: 180,
                              scale: 0.8,
                              opacity: 0,
                              borderRadius: 24,
                            }
                      }
                      animate={{
                        top: targetT,
                        left: targetL,
                        width: targetW,
                        height: targetH,
                        rotateY: 180,
                        scale: 1,
                        opacity: 1,
                        borderRadius: 24,
                      }}
                      exit="exit"
                      transition={{
                        duration: 0.62,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    >
                      {/* MẶT TRƯỚC */}
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col items-center justify-center text-center rounded-[inherit]",
                          activeNat.isPopular
                            ? "gap-4 border border-(--color-primary)/30 bg-amber-50/20 dark:bg-amber-950/20"
                            : "gap-3 border border-(--color-border) bg-(--color-surface-1)"
                        )}
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                        }}
                      >
                        <LazyFlag
                          countryName={activeNat.name || activeNat.label}
                          isoCode={activeNat.code}
                          fallbackFlag={activeNat.flag}
                          className={cn(
                            "rounded-full border border-stone-200 bg-stone-50 shrink-0",
                            activeNat.isPopular ? "w-16 h-16" : "w-12 h-12"
                          )}
                        />
                        <span
                          className={cn(
                            "font-bold text-(--color-text-secondary) font-heading",
                            activeNat.isPopular ? "text-sm" : "text-xs"
                          )}
                        >
                          {activeNat.label}
                        </span>
                      </div>

                      {/* MẶT SAU */}
                      <div
                        className={cn(
                          "absolute inset-0 rounded-[inherit] border shadow-2xl overflow-hidden transition-colors duration-300",
                          getDialogThemeClasses(activeNat.group)
                        )}
                        style={{
                          backfaceVisibility: "hidden",
                          WebkitBackfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{
                            width: targetW,
                            height: targetH,
                          }}
                        >
                          <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{
                              opacity: 0,
                              transition: {
                                duration: 0.15,
                              },
                            }}
                            transition={{
                              delay: 0.35,
                              duration: 0.2,
                            }}
                            className="w-full h-full"
                          >
                            <NationalityDialogContent
                              nat={activeNat}
                              exemption={exemptionRule}
                              onClose={() => setActiveNat(null)}
                              targetW={targetW}
                              targetH={targetH}
                            />
                          </m.div>
                        </div>
                      </div>
                    </m.div>
                  </div>
                )}
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}
