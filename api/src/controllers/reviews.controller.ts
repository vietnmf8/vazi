import type { NextFunction, Request, Response } from "express";
import prisma from "@/lib/prisma";
import type { CreateReviewDto } from "@/validators/reviews.validator";

export async function listReviews(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const { featured } = req.query;
    const whereClause: any = { isActive: true };
    if (featured === "true") {
        whereClause.isFeatured = true;
    }

    const reviews = await prisma.review.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
    });

    res.success(reviews);
}

export async function createReview(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = req.body as CreateReviewDto;

    const review = await prisma.review.create({
        data: {
            authorName: data.author_name,
            countryCode: data.country_code.toUpperCase(),
            content: data.content,
            rating: data.rating || 5,
            isActive: false,
            isFeatured: false,
        },
    });

    res.success(review, 201);
}
