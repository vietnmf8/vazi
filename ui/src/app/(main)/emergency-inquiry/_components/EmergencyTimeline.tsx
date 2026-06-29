"use client"

import { FileText, Send, Mail } from "lucide-react"

// Map string names to Lucide icons
const IconMap: Record<string, React.ElementType> = {
  FileText,
  Send,
  Mail
}

interface EmergencyTimelineProps {
  config: any;
}

export function EmergencyTimeline({ config }: EmergencyTimelineProps) {
  if (!config) return null;

  return (
    <div className="space-y-6" data-ai-target="emergency_timeline">
      <div className="flex flex-col gap-2">
        <h3 className="section-subtitle">
          {config.title}
        </h3>
        <p className="body-text-sm">
          {config.desc}
        </p>
      </div>

      <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
        <div className="absolute top-7 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-(--color-primary)/30 via-(--color-primary)/20 to-transparent hidden sm:block pointer-events-none" />

        {(config.steps || []).map((step: any) => {
          const Icon = IconMap[step.icon] || FileText;
          return (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center p-5 rounded-xl border border-(--color-border) bg-(--color-surface-2) hover:border-(--color-border-strong) transition-all duration-300 group"
            >
              <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-linear-to-r from-(--color-primary-dark) to-(--color-primary) text-white font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Icon className="h-6 w-6" />
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-(--color-surface-1) border border-(--color-primary) text-(--color-primary) text-3xs font-extrabold">
                  {step.number}
                </span>
              </div>

              <h4 className="mt-4 text-sm font-bold text-(--color-text-primary) font-body">
                {step.title}
              </h4>
              <p className="mt-2 caption-text text-center">
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
