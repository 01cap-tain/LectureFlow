import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";
import {
  validateGetStudentLectures,
  validateVenueIdParam,
} from "../Middleware/student.middleware.js";
import {
  getStudentLectures,
  getVenueQueue,
} from "../Controller/student.controller.js";

const router = express.Router();

router.get(
  "/lectures",
  requireAuth,
  requireRole("student"),
  validateGetStudentLectures,
  getStudentLectures,
);

router.get(
  "/venues/:venue_id/queue",
  requireAuth,
  requireRole("student"),
  validateVenueIdParam,
  getVenueQueue,
);

export default router;
