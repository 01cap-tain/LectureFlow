import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";
import { getMyCourses } from "../Controller/courses.controller.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("moderator"), getMyCourses);

export default router;
