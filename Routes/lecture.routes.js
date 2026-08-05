import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";
import { lecturerWriteRateLimit } from "../Middleware/rate-limit.middleware.js";
import {
  validateScheduleLecture,
  validatePostponeLecture,
} from "../Middleware/lecture.middleware.js";
import {
  scheduleLecture,
  getMyCourses,
  getVenues,
  postponeLecture,
  cancelLecture,
  getMyLectures,
} from "../Controller/lecture.controller.js";

const router = express.Router();

// Get courses
router.get("/courses/my", requireAuth, requireRole("moderator"), getMyCourses);

// Get venues
router.get("/venues", requireAuth, requireRole("moderator"), getVenues);

// Schedule lecture
router.post(
  "/",
  requireAuth,
  requireRole("moderator"),
  lecturerWriteRateLimit,
  validateScheduleLecture,
  scheduleLecture,
);

// Postpone lecture
router.patch(
  "/:id/postpone",
  requireAuth,
  requireRole("moderator"),
  lecturerWriteRateLimit,
  validatePostponeLecture,
  postponeLecture,
);

// Cancel lecture
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("moderator"),
  lecturerWriteRateLimit,
  cancelLecture,
);

// Get my lectures
router.get("/my", requireAuth, requireRole("moderator"), getMyLectures);
export default router;

