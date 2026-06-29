import { Router } from "express";

import * as authController from "@/controllers/auth.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { loginBodySchema, registerBodySchema, verifyEmailBodySchema, changePasswordBodySchema, verifyOldPasswordBodySchema, forgotPasswordBodySchema, resetPasswordBodySchema, updateMeBodySchema } from "@/validators/auth.validator";
import { verifyToken } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/login",
    validate(loginBodySchema),
    asyncHandler(authController.postAuthLogin),
);

router.post("/register",
    validate(registerBodySchema),
    asyncHandler(authController.postAuthRegister),
);

router.post("/verify-email",
    validate(verifyEmailBodySchema),
    asyncHandler(authController.postAuthVerifyEmail),
);

router.get("/me",
    verifyToken,
    asyncHandler(authController.getAuthMe),
);

router.post("/change-password",
    verifyToken,
    validate(changePasswordBodySchema),
    asyncHandler(authController.postAuthChangePassword),
);

router.post("/verify-old-password",
    verifyToken,
    validate(verifyOldPasswordBodySchema),
    asyncHandler(authController.postAuthVerifyOldPassword),
);

router.post("/forgot-password",
    validate(forgotPasswordBodySchema),
    asyncHandler(authController.postAuthForgotPassword),
);

router.post("/reset-password",
    validate(resetPasswordBodySchema),
    asyncHandler(authController.postAuthResetPassword),
);

router.put("/me",
    verifyToken,
    validate(updateMeBodySchema),
    asyncHandler(authController.putAuthMe),
);

export default router;
