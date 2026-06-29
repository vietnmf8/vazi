"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, CheckCircle2, HelpCircle, ChevronDown } from "lucide-react"
import { AnimatePresence, m } from "framer-motion"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import type { FaqCategory, FaqItem } from "@/types/api"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { submitContact } from "@/lib/api/support.api"
import toast from "react-hot-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

/**
 * FAQ với category tabs + search client-side + Ask a Question Form.
 * Redesigned: Modern 2026 Travel dark theme.
 */
export function FaqsClient({ initialFaqs }: { initialFaqs: FaqItem[] }) {
  const t = useTranslations("FaqsPage")
  const categories = t.raw("Data.Categories") as { id: FaqCategory; label: string }[]

  const [activeCategory, setActiveCategory] = useState<FaqCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  const formSchema = useMemo(() => z.object({
    name: z.string().min(1, t("Form.errorEmpty")),
    email: z.string().min(1, t("Form.errorEmpty")).email(t("Form.errorEmail")),
    question: z.string().min(1, t("Form.errorEmpty"))
  }), [t])

  type FormValues = z.infer<typeof formSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      question: ""
    }
  })

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return initialFaqs.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory
      const matchesSearch =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery, initialFaqs])

  const onSubmit = async (data: FormValues) => {
    // Optimistic UI: Hiển thị toast ngay lập tức và reset form
    toast.success(t("Form.successDesc", { email: data.email }), { position: 'top-center' });
    
    // Lưu lại dữ liệu trước khi reset để gửi ngầm
    const payload = {
      full_name: data.name,
      email: data.email,
      subject: "FAQ Support Question",
      message: data.question,
    };
    
    reset();

    // Gửi ngầm trong background
    submitContact(payload).catch((err) => {
      // Có thể log lỗi ở đây, toast lỗi tuỳ ý nếu cần, hiện tại im lặng theo logic optimistic UI cơ bản.
      console.error("Failed to submit question:", err);
    });
  }

  return (
    <div className="space-y-8" data-ai-target="faqs_list">
      {/* Search */}
      <div className="relative">
        <Input
          type="search"
          placeholder={t("UI.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="h-4 w-4" aria-hidden />}
          aria-label={t("UI.searchPlaceholder")}
          data-ai-id="faqs-search-input"
          data-ai-desc="Ô tìm kiếm câu hỏi thường gặp FAQ"
          className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm py-3 pr-4 pl-11 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
        />
      </div>

      {/* Category Tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="FAQ categories"
        data-ai-id="faq-categories-tab"
        data-ai-desc="Danh sách các danh mục FAQ (Visa Information, Application Process, Pricing, v.v.)"
      >
        <CategoryTab
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          label={t("UI.tabAll")}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            label={cat.label}
          />
        ))}
      </div>

      {/* FAQ Items */}
      <div className="space-y-3 mx-auto max-w-3xl lg:max-w-none" role="region" aria-label="FAQ list" data-ai-id="faq-list" data-ai-desc="Danh sách các câu hỏi thường gặp FAQ. Vui lòng mở rộng để xem câu trả lời chi tiết.">
        {filteredFaqs.length === 0 ? (
          <p className="text-center text-(--color-text-muted) py-12">
            {t("UI.noResults")}
          </p>
        ) : (
          filteredFaqs.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `faq-panel-${item.id}`;
            const buttonId = `faq-button-${item.id}`;

            return (
              <div
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-300",
                  isOpen
                    ? "border-(--color-primary) bg-(--color-surface-1) shadow-sm"
                    : "border-(--color-border) bg-(--color-surface-1) hover:border-(--color-primary)/40 transition-all"
                )}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    className="flex min-h-16 w-full items-center justify-between gap-4 px-6 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-surface-1) "
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(item.id)}
                  >
                    <span className="font-body text-sm sm:text-base font-bold text-(--color-text-primary) transition-all">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-(--color-primary) transition-transform duration-300",
                        isOpen ? "rotate-180" : "rotate-0"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      key="content"
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="border-t border-(--color-border) bg-(--color-surface-2) px-6 py-5 text-sm leading-relaxed text-(--color-text-secondary) font-body prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: item.answer }}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Ask Our Experts widget */}
      <div className="mt-16 rounded-xl border border-(--color-border) bg-(--color-surface-2) p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full bg-(--color-primary) opacity-5 blur-3xl pointer-events-none" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-ai-id="faq-ask-form" data-ai-desc="Form gửi câu hỏi hỗ trợ trong trang FAQ">
            <div className="flex items-center gap-3 pb-2 border-b border-(--color-border)">
              <div className="flex size-8 items-center justify-center rounded-full bg-(--color-primary-subtle) text-(--color-primary)">
                <HelpCircle className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-base font-bold text-(--color-text-primary) font-body">
                  {t("Form.widgetTitle")}
                </h3>
                <p className="text-xs text-(--color-text-muted)">
                  {t("Form.widgetSubtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="faq-name" className="text-sm font-medium text-(--color-text-primary)">
                  {t("Form.fullName")}
                </label>
                <Input
                  id="faq-name"
                  type="text"
                  placeholder={t("Form.namePlaceholder")}
                  {...register("name")}
                  error={!!errors.name}
                  className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                />
                {errors.name && (
                  <p className="text-sm text-(--color-error) font-medium mt-1.5 animate-in slide-in-from-top-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="faq-email" className="text-sm font-medium text-(--color-text-primary)">
                  {t("Form.email")}
                </label>
                <Input
                  id="faq-email"
                  type="email"
                  placeholder={t("Form.emailPlaceholder")}
                  {...register("email")}
                  error={!!errors.email}
                  className="bg-(--color-surface-1) border border-(--color-border-strong) rounded-sm px-4 py-3 text-base text-(--color-text-primary) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)] focus:outline-none transition-all duration-200"
                />
                {errors.email && (
                  <p className="text-sm text-(--color-error) font-medium mt-1.5 animate-in slide-in-from-top-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="faq-question" className="text-sm font-medium text-(--color-text-primary)">
                  {t("Form.question")}
                </label>
                <textarea
                  id="faq-question"
                  rows={4}
                  placeholder={t("Form.questionPlaceholder")}
                  {...register("question")}
                  className={cn(
                    "flex w-full bg-(--color-surface-1) rounded-sm px-4 py-3 text-base text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none transition-all duration-200 resize-y",
                    errors.question
                      ? "border-2 border-(--color-error) focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)]"
                      : "border border-(--color-border-strong) focus:border-(--color-primary) focus:shadow-[0_0_0_3px_rgba(200,150,90,0.15)]"
                  )}
                />
                {errors.question && (
                  <p className="text-sm text-(--color-error) font-medium mt-1.5 animate-in slide-in-from-top-1">
                    {errors.question.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full sm:w-auto px-8"
              data-ai-element="faqs_submit_question"
            >
              {t("Form.submitBtn")}
            </Button>
          </form>
      </div>
    </div>
  )
}

function CategoryTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg) ${
        active
          ? "border-(--color-primary) bg-(--color-primary-subtle) text-(--color-primary)"
          : "border-(--color-border) text-(--color-text-muted) hover:text-(--color-text-primary) hover:border-(--color-border-strong) transition-all"
      }`}
    >
      {label}
    </button>
  )
}
