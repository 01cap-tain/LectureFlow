import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";

import {
  createAdmin,
  createDepartment,
  createFaculty,
  createLecturer,
} from "../Controller/admin-auth.js";

import {
  validateCreateAdmin,
  validateCreateDepartment,
  validateCreateFaculty,
  validateCreateLecturer,
} from "../Middleware/admin-middleware.js";

const router = express.Router();

// Create Admin
router.post(
  "/admins",
  requireAuth,
  requireRole("admin"),
  validateCreateAdmin,
  createAdmin,
);

// Create Lecturer (Moderator)
router.post(
  "/lecturers",
  requireAuth,
  requireRole("admin"),
  validateCreateLecturer,
  createLecturer,
);

// Create Faculty
router.post(
  "/faculties",
  requireAuth,
  requireRole("admin"),
  validateCreateFaculty,
  createFaculty,
);

// Create Department
router.post(
  "/departments",
  requireAuth,
  requireRole("admin"),
  validateCreateDepartment,
  createDepartment,
);

export default router;
