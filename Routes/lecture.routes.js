import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";
import { validateScheduleLecture } from "../Middleware/lecture.middleware.js";
import {
  scheduleLecture,
  getMyCourses,
  getVenues,
} from "../Controller/lecture.controller.js";

const router = express.Router();

// Get courses for the logged-in lecturer
router.get("/courses/my", requireAuth, requireRole("moderator"), getMyCourses);

// Get all active venues
router.get("/venues", requireAuth, requireRole("moderator"), getVenues);

// Schedule a lecture
router.post(
  "/",
  requireAuth,
  requireRole("moderator"),
  validateScheduleLecture,
  scheduleLecture,
);

export default router;
