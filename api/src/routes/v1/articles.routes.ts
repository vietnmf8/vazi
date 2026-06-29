import { Router } from "express";
import {
    getArticlesController,
    getArticleBySlugController,
} from "@/controllers/articles.controller";

const router = Router();

router.get("/", getArticlesController);
router.get("/:slug", getArticleBySlugController);

export default router;
