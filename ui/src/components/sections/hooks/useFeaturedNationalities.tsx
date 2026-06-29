import { useState, useEffect, useRef, useSyncExternalStore, useMemo, useCallback } from "react";
import type { NationalityCard, NationalityGroup } from "../nationalities/types";
import { FEATURED_NATIONALITIES, EXTENDED_NATIONALITIES, getFlagUrl } from "../nationalities/data";
import { LOADED_FLAGS_CACHE } from "../nationalities/LazyFlag";
import type { Nationality } from "@/types/api";
import type { ComboboxOption } from "@/components/ui/Combobox";
import { useLocalizedCountryName } from "@/hooks/useLocalizedCountryName";

const emptySubscribe = () => () => {};

const LEGACY_MAP = new Map(
  [...FEATURED_NATIONALITIES, ...EXTENDED_NATIONALITIES].map((n) => [n.code, n])
);

export function useFeaturedNationalities(apiNationalities: Nationality[]) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { getLocalizedName, locale } = useLocalizedCountryName();
  
  const nationalities = useMemo<NationalityCard[]>(() => {
    return apiNationalities.map((n) => {
      const code = n.code.toLowerCase();
      const legacy = LEGACY_MAP.get(code);
      const apiGroup = (n as any).group?.toLowerCase() || "normal";
      return {
        code,
        label: getLocalizedName(code, (n as any).label || n.name, (n as any).is_custom_name),
        name: (n as any).label || n.name,
        href: legacy?.href || "/guide/visa-exemptions",
        flag: legacy?.flag || "",
        group: apiGroup as NationalityGroup,
        isPopular: apiGroup === "popular",
        exemptionDays: n.exemption_days,
      };
    });
  }, [apiNationalities, getLocalizedName]);

  const [isLoading, setIsLoading] = useState(false);

  const [showMore, setShowMore] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [activeTab, setActiveTab] = useState<NationalityGroup>("good");
  const [isOpenFromSearch, setIsOpenFromSearch] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const extendedSectionRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    nationalities.forEach((c) => {
      const url = getFlagUrl(c.name || c.label, c.code);
      if (LOADED_FLAGS_CACHE.has(url)) return;
      const img = new globalThis.Image();
      img.onload = () => {
        LOADED_FLAGS_CACHE.add(url);
      };
      img.src = url;
    });
  }, [nationalities]);

  const [activeNat, setActiveNat] = useState<NationalityCard | null>(null);
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);

  const targetW =
    typeof window !== "undefined" ? Math.min(500, window.innerWidth - 32) : 500;
  const targetH = 540;
  const targetT =
    typeof window !== "undefined" ? (window.innerHeight - targetH) / 2 : 0;
  const targetL =
    typeof window !== "undefined" ? (window.innerWidth - targetW) / 2 : 0;

  const handleToggleShowMore = () => {
    setShowMore(!showMore);
  };

  useEffect(() => {
    if (!activeNat) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveNat(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNat]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty("position");
      document.body.style.removeProperty("top");
      document.body.style.removeProperty("width");
      document.body.style.removeProperty("overflow-y");
    };
  }, []);

  const triggerOpenModal = (
    nat: NationalityCard,
    sourceEl?: HTMLElement | null,
    isSearch = false
  ) => {
    setIsOpenFromSearch(isSearch);

    if (isSearch) {
      setActiveRect(null);
    } else {
      const targetEl =
        sourceEl ||
        (typeof document !== "undefined"
          ? (document.querySelector(`[data-nat-card="${nat.code}"]`) as HTMLElement)
          : null);

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        setActiveRect(rect);
        targetEl.style.opacity = "0";
        targetEl.style.transition = "none";
        targetEl.style.pointerEvents = "none";
      } else {
        setActiveRect(null);
      }
    }

    const scrollY = window.scrollY;
    document.body.style.setProperty("position", "fixed", "important");
    document.body.style.setProperty("top", `-${scrollY}px`, "important");
    document.body.style.setProperty("width", "100%", "important");
    document.body.style.setProperty("overflow-y", "scroll", "important");

    setActiveNat(nat);
  };

  const handleTileClick = (e: React.MouseEvent, nat: NationalityCard) => {
    e.preventDefault();
    triggerOpenModal(nat, e.currentTarget as HTMLElement, false);
  };

  const handleCheckRequirement = useCallback((overrideCountry?: string) => {
    const codeToCheck = overrideCountry || selectedCountry;
    
    const match = nationalities.find((c) => c.code === codeToCheck);
    if (match) {
      const tabChanged = match.group !== activeTab;
      if (tabChanged) {
        setActiveTab(match.group);
      }
      if (tabChanged) {
        setTimeout(() => triggerOpenModal(match, null, true), 150);
      } else {
        triggerOpenModal(match, null, true);
      }
    } else {
    }
  }, [selectedCountry, nationalities, activeTab, setActiveTab]);

  const handleExitComplete = () => {
    if (!isOpenFromSearch) {
      document.querySelectorAll("[data-nat-card]").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.opacity = "1";
        htmlEl.getBoundingClientRect();
        htmlEl.style.transition = "";
        htmlEl.style.opacity = "";
        htmlEl.style.pointerEvents = "";
      });
    }

    const scrollY = document.body.style.top;
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("width");
    document.body.style.removeProperty("overflow-y");

    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    setActiveRect(null);
    setIsOpenFromSearch(false);
  };

  const popularNats = nationalities.filter((n) => n.isPopular);
  const filteredExtendedNats = nationalities.filter(
    (c) => c.group === activeTab && !c.isPopular
  );

  const goodCount = nationalities.filter((c) => c.group === "good").length;
  const normalCount = nationalities.filter((c) => c.group === "normal").length;
  const blacklistCount = nationalities.filter((c) => c.group === "blacklist").length;

  const cardVariants = {
    exit: (code: string) => {
      const el = document.querySelector(`[data-nat-card="${code}"]`) as HTMLElement;
      const r = el ? el.getBoundingClientRect() : activeRect;
      if (!r) {
        return {
          opacity: 0,
          scale: 0.8,
        };
      }

      const computedStyle = el ? window.getComputedStyle(el) : null;
      const targetRadius = computedStyle ? parseFloat(computedStyle.borderRadius) : 12;

      return {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        rotateY: 0,
        borderRadius: targetRadius,
      };
    },
  };

  const nationalityOptions = useMemo<ComboboxOption[]>(() => {
    const sorted = [...nationalities].sort((a, b) => a.label.localeCompare(b.label, locale));
    const groups = new Map<string, NationalityCard[]>();
    for (const c of sorted) {
      const letter = c.label[0].toUpperCase();
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(c);
    }
    const result: ComboboxOption[] = [];
    for (const [letter, items] of groups) {
      result.push({ value: `__header_${letter}`, label: letter, isHeader: true });
      for (const c of items) {
        result.push({
          value: c.code,
          label: c.label,
          icon: (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getFlagUrl(c.name || c.label, c.code)}
              className="w-5 h-5 object-cover rounded-full border border-stone-200/50 shrink-0"
              alt=""
            />
          ),
        });
      }
    }
    return result;
  }, [nationalities, locale]);

  return {
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
  };
}
