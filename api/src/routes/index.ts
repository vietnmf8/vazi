import { Router } from "express";
import authRoutes from "@/routes/v1/auth.routes";
import applicationsRoutes from "@/routes/v1/applications.routes";
import nationalitiesRoutes from "@/routes/v1/nationalities.routes";
import portsRoutes from "@/routes/v1/ports.routes";
import pricingRoutes from "@/routes/v1/pricing.routes";
import uploadsRoutes from "@/routes/v1/uploads.routes";
import paymentsRoutes from "@/routes/v1/payments.routes";
import supportRoutes from "@/routes/v1/support.routes";
import exemptionsRoutes from "@/routes/v1/exemptions.routes";
import chatRoutes from "@/routes/v1/chat.routes";
import articlesRoutes from "@/routes/v1/articles.routes";
import exemptionCountriesRoutes from "@/routes/v1/exemption-countries.routes";

import teamRoutes from "@/routes/v1/team.routes";
import reviewsRoutes from "@/routes/v1/reviews.routes";
import faqsRoutes from "@/routes/v1/faqs.routes";
import settingsRoutes from "@/routes/v1/settings.routes";
import homeRoutes from "@/routes/v1/home.routes";
import guidelinesRoutes from "@/routes/v1/guidelines.routes";
import configRoutes from "@/routes/v1/config.routes";
import newsletterRoutes from "@/routes/v1/newsletter.routes";
import commentRoutes from "@/routes/v1/comment.routes";
import reelsRoutes from "@/routes/v1/reels.routes";
import adminRoutes from "@/routes/v1/admin";

/**
 * Router API v1 — mount tại `/api/v1` trong `app.ts`.
 *
 * `/health` phục vụ probe uptime (load balancer, dev kiểm tra nhanh).
 * Master data: pricing (cache 5 phút), nationalities, ports — public, không auth.
 * Applications: calculate-price, submit (public; submit có optional JWT).
 * Payments: create-session (+ capture-order) — public; webhook mount riêng trong `app.ts` (JSON + verify).
 * Uploads: presigned-params Cloudinary (public).
 * Support / blog / exemptions / articles — public GET/POST roadmap Stage 3 Step 3.
 * Chat — Soketi/Pusher-compatible realtime Stage 4 Step 2 (REST publish).
 */
const apiV1 = Router();

apiV1.get("/health", (_req, res) => {
    res.success({ status: "ok" });
});

apiV1.use("/auth", authRoutes);
apiV1.use("/pricing", pricingRoutes);
apiV1.use("/nationalities", nationalitiesRoutes);
apiV1.use("/ports", portsRoutes);
apiV1.use("/uploads", uploadsRoutes);
apiV1.use("/payments", paymentsRoutes);
apiV1.use("/applications", applicationsRoutes);
apiV1.use("/support", supportRoutes);
apiV1.use("/articles", articlesRoutes);
apiV1.use("/exemptions", exemptionsRoutes);
apiV1.use("/exemption-countries", exemptionCountriesRoutes);
apiV1.use("/chat", chatRoutes);

apiV1.use("/team-members", teamRoutes);
apiV1.use("/reviews", reviewsRoutes);
apiV1.use("/faqs", faqsRoutes);
apiV1.use("/settings", settingsRoutes);
apiV1.use("/home", homeRoutes);
apiV1.use("/guidelines", guidelinesRoutes);
apiV1.use("/config", configRoutes);
apiV1.use("/newsletter", newsletterRoutes);
apiV1.use("/comments", commentRoutes);
apiV1.use("/reels", reelsRoutes);
apiV1.use("/admin", adminRoutes);
import guestRoutes from "@/routes/v1/guest.routes";
apiV1.use("/guest", guestRoutes);

export default apiV1;
