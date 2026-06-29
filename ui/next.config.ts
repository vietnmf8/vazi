import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
    // ─── USER PERFORMANCE ─────────────────────────────────────────────────────

    // React Compiler (stable Next.js 16): tự động memoize component/hook,
    // loại bỏ toàn bộ useMemo/useCallback viết tay — không cần đổi code
    // Peer dependency bắt buộc: npm install babel-plugin-react-compiler
    reactCompiler: true,

    // Bỏ header "X-Powered-By: Next.js" — giảm nhẹ response size + không leak stack info
    poweredByHeader: false,

    // Bật gzip/Brotli compression cho mọi response (explicit, default là true)
    compress: false,

    // ─── DEVELOPER EXPERIENCE ─────────────────────────────────────────────────

    // Strict Mode: double-invoke lifecycle trong dev để phát hiện side effects sớm
    // reactStrictMode: true,

    // Hiện full URL của mọi fetch call trong terminal dev — debug data fetching dễ hơn
    logging: {
        fetches: {
            fullUrl: true,
        },
    },

    cacheComponents: true,
    experimental: {},

    // ─── TURBOPACK ────────────────────────────────────────────────────────────
    turbopack: {
        rules: {
            "*.svg": {
                loaders: ["@svgr/webpack"],
                as: "*.js",
            },
        },
    },

    // ─── IMAGES ───────────────────────────────────────────────────────────────
    images: {
        // AVIF format: nhỏ hơn WebP ~20%, Next.js tự negotiate với browser
        formats: ["image/avif", "image/webp"],
        // Cache ảnh đã optimize trên server 30 ngày — tránh round-trip Unsplash mỗi lần load
        minimumCacheTTL: 60 * 60 * 24 * 30,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.atlys.com",
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
            },
            {
                protocol: "https",
                hostname: "i.pravatar.cc",
            },
            {
                protocol: "https",
                hostname: "videos.pexels.com",
            },
            {
                protocol: "https",
                hostname: "via.placeholder.com",
            },
        ],
    },

    // ─── WEBPACK ──────────────────────────────────────────────────────────────
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: ["@svgr/webpack"],
        });
        return config;
    },
};

export default withNextIntl(nextConfig);
