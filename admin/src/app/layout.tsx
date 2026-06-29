import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
 title: "FastVisa Admin",
 description: "Internal admin dashboard for FastVisa live chat",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
 <html lang="vi" suppressHydrationWarning>
  <head>
   <link rel="icon" type="image/svg+xml" href="/favicon-light.svg" media="(prefers-color-scheme: light)" />
   <link rel="icon" type="image/svg+xml" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)" />
   <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
   <link rel="manifest" href="/site.webmanifest" />
  </head>
 <body suppressHydrationWarning>
 <Providers>{children}</Providers>
 </body>
 </html>
 )
}
