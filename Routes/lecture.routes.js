import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";
import { validateScheduleLecture } from "../Middleware/lecture.middleware.js";
import { scheduleLecture } from "../Controller/lecture.controller.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("moderator"),
  validateScheduleLecture,
  scheduleLecture,
);

export default router;
