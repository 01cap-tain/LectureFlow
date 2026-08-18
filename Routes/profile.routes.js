import express from "express";
import { requireAuth } from "../Middleware/user-middleware.js";
import { profileUpdateRateLimit } from "../Middleware/rate-limit.middleware.js";
import {
  validateCompleteProfile,
  validateProfilePasswordReset,
  validateUpdateProfile,
} from "../Middleware/profile.middleware.js";
import {
  getMyProfile,
  completeProfile,
  resetProfilePassword,
  updateProfile,
} from "../Controller/profile.controller.js";

const router = express.Router();

router.get("/me", requireAuth, getMyProfile);

router.patch(
  "/complete",
  requireAuth,
  validateCompleteProfile,
  completeProfile,
);

router.patch(
  "/update",
  requireAuth,
  profileUpdateRateLimit,
  validateUpdateProfile,
  updateProfile,
);

router.patch(
  "/password",
  requireAuth,
  profileUpdateRateLimit,
  validateProfilePasswordReset,
  resetProfilePassword,
);

export default router;
