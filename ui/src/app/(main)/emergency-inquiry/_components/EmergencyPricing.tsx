"use client"

import Link from "next/link"
import { Zap, Clock, MessageSquare, ChevronRight, AlertTriangle, Star } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { PricingRule } from "@/types/api"

type PricingTier = {
  id: string
  key?: string
  name: string
  price?: string | number
  timeframe: string
  description: string
  bestFor: string
  link: string
  isHighlighted?: boolean
}

interface EmergencyPricingProps {
  pricing?: PricingRule;
  config: any;
}

export function EmergencyPricing({ pricing, config }: EmergencyPricingProps) {
  if (!pricing || !config) {
    return (
      <div className="rounded-xl border border-red-500/25 bg-[rgba(239,68,68,0.04)] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <h3 className="text-lg font-bold text-(--color-text-primary)">
            {config?.pricing_unavailable || "Pricing unavailable"}
          </h3>
        </div>
      </div>
    );
  }

  const tiers: PricingTier[] = (config.tiers || []).map((tier: any) => {
    if (tier.id === "last-minute") return tier as PricingTier;
    
    // @ts-ignore
    const price = pricing.processingTimes[tier.key];
    if (price === undefined) return null;

    return { ...tier, price } as PricingTier;
  }).filter((tier: any): tier is PricingTier => tier !== null);

  return (
    <div className="space-y-6" data-ai-target="emergency_pricing">
      <div className="flex flex-col gap-2">
        <h3 className="section-subtitle flex items-center gap-2">
          <Zap className="h-5 w-5 text-(--color-primary)" />
          {config.title}
        </h3>
        <p className="body-text-sm">
          {config.desc}
        </p>
      </div>

      <div className="grid gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-xl border p-5 transition-all duration-300 ${
              tier.isHighlighted
                ? "border-(--color-primary) bg-(--color-primary)/10 shadow-[0_0_20px_var(--color-primary-subtle)]"
                : "border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-strong) transition-all"
            }`}
          >
            {tier.isHighlighted && (
              <div 
                className="absolute -top-3 right-6 flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-primary)_0%,var(--color-primary-light)_50%,var(--color-primary)_100%)] p-1.5 shadow-md shadow-[var(--color-primary-subtle)]"
                title={config.most_requested}
              >
                <Star className="h-3.5 w-3.5 text-white fill-white dark:text-black dark:fill-black" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-(--color-text-primary) font-body">
                    {tier.name}
                  </h4>
                  <span className="flex items-center gap-1 text-xs text-(--color-primary) font-medium bg-(--color-primary)/10 px-2 py-0.5 rounded-sm">
                    <Clock className="h-3 w-3" />
                    {tier.timeframe}
                  </span>
                </div>
                <p className="caption-text max-w-md">
                  {tier.description}
                </p>
                <div className="text-xs text-(--color-text-secondary) font-body">
                  <span className="text-(--color-text-muted)">{config.best_for}</span> {tier.bestFor}
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1 shrink-0">
                <div className="text-right">
                  <span className="text-2xs text-(--color-text-muted) block">{config.service_fee}</span>
                  <span className="text-lg font-bold text-(--color-primary) font-body">
                    {typeof tier.price === "number" ? `$${tier.price}` : tier.price}
                  </span>
                </div>

                {tier.id === "last-minute" ? (
                  <Button
                    asChild
                    size="sm"
                    className="bg-emerald-600 bg-none hover:bg-emerald-700 text-white border-0 transition-all shadow-none hover:shadow-none"
                  >
                    <a href={tier.link} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {config.whatsapp_btn}
                    </a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant={tier.isHighlighted ? "default" : "outline"}
                  >
                    <Link href={tier.link as any}>
                      {config.apply_btn}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
