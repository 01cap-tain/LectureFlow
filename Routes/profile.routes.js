import express from "express";
import { requireAuth } from "../Middleware/user-middleware.js";
import {
  validateCompleteProfile,
  validateUpdateProfile,
} from "../Middleware/profile.middleware.js";
import {
  getMyProfile,
  completeProfile,
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

router.patch("/update", requireAuth, validateUpdateProfile, updateProfile);

export default router;
