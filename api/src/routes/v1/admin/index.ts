import { Router } from "express";

import applicationsAdminRoutes from "@/routes/v1/admin/applications.route";
import articlesAdminRoutes from "@/routes/v1/admin/articles.route";
import commentsAdminRoutes from "@/routes/v1/admin/comments.route";
import dashboardAdminRoutes from "@/routes/v1/admin/dashboard.route";
import eligibilityRulesAdminRoutes from "@/routes/v1/admin/eligibility-rules.route";
import exemptionCountriesAdminRoutes from "@/routes/v1/admin/exemption-countries.route";
import faqsAdminRoutes from "@/routes/v1/admin/faqs.route";
import globalSettingsAdminRoutes from "@/routes/v1/admin/global-settings.route";
import guidelinesAdminRoutes from "@/routes/v1/admin/guidelines.route";
import nationalitiesAdminRoutes from "@/routes/v1/admin/nationalities.route";
import newsletterAdminRoutes from "@/routes/v1/admin/newsletter.route";
import pageSettingsAdminRoutes from "@/routes/v1/admin/page-settings.route";
import portsAdminRoutes from "@/routes/v1/admin/ports.route";
import pricingRulesAdminRoutes from "@/routes/v1/admin/pricing-rules.route";
import reviewsAdminRoutes from "@/routes/v1/admin/reviews.route";
import stepGuidelinesAdminRoutes from "@/routes/v1/admin/step-guidelines.route";
import supportTicketsAdminRoutes from "@/routes/v1/admin/support-tickets.route";
import teamMembersAdminRoutes from "@/routes/v1/admin/team-members.route";
import nlpCacheAdminRoutes from "@/routes/v1/admin/nlp-cache.route";
import usersAdminRoutes from "@/routes/v1/admin/users.route";
import reelsAdminRoutes from "@/routes/v1/admin/reels.route";

/**
 * Router admin — mount tại `/api/v1/admin`.
 * Mọi route yêu cầu JWT + role ADMIN + email trong ALLOWED_ADMIN_EMAIL.
 */
const adminRouter = Router();

adminRouter.use("/dashboard", dashboardAdminRoutes);
adminRouter.use("/applications", applicationsAdminRoutes);
adminRouter.use("/support-tickets", supportTicketsAdminRoutes);
adminRouter.use("/global-settings", globalSettingsAdminRoutes);
adminRouter.use("/page-settings", pageSettingsAdminRoutes);
adminRouter.use("/articles", articlesAdminRoutes);
adminRouter.use("/faqs", faqsAdminRoutes);
adminRouter.use("/guidelines", guidelinesAdminRoutes);
adminRouter.use("/step-guidelines", stepGuidelinesAdminRoutes);
adminRouter.use("/team-members", teamMembersAdminRoutes);
adminRouter.use("/reviews", reviewsAdminRoutes);
adminRouter.use("/comments", commentsAdminRoutes);
adminRouter.use("/nationalities", nationalitiesAdminRoutes);
adminRouter.use("/ports", portsAdminRoutes);
adminRouter.use("/pricing-rules", pricingRulesAdminRoutes);
adminRouter.use("/exemption-countries", exemptionCountriesAdminRoutes);
adminRouter.use("/eligibility-rules", eligibilityRulesAdminRoutes);
adminRouter.use("/newsletter", newsletterAdminRoutes);
adminRouter.use("/users", usersAdminRoutes);
adminRouter.use("/nlp-cache", nlpCacheAdminRoutes);
adminRouter.use("/reels", reelsAdminRoutes);

export default adminRouter;
