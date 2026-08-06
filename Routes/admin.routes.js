import express from "express";
import { requireAuth, requireRole } from "../Middleware/user-middleware.js";

import {
  createAdmin,
  createDepartment,
  createFaculty,
  createLecturer,
  createCourse,
  createVenue,
  deleteUser,
  deleteLecturer,
  deleteLecture,
  listAdmins,
  listCourses,
  listDepartments,
  listFaculties,
  listLecturers,
  listVenues,
} from "../Controller/admin-auth.js";

import {
  validateAdminIdParam,
  validateCreateAdmin,
  validateCreateDepartment,
  validateCreateFaculty,
  validateCreateLecturer,
  validateCreateCourse,
  validateCreateVenue,
} from "../Middleware/admin-middleware.js";

const router = express.Router();

// Admin list endpoints for dashboard tables and form dropdowns.
router.get("/admins", requireAuth, requireRole("admin"), listAdmins);
router.get("/lecturers", requireAuth, requireRole("admin"), listLecturers);
router.get("/faculties", requireAuth, requireRole("admin"), listFaculties);
router.get("/departments", requireAuth, requireRole("admin"), listDepartments);
router.get("/courses", requireAuth, requireRole("admin"), listCourses);
router.get("/venues", requireAuth, requireRole("admin"), listVenues);

// Remove active users from the system without breaking lecture history.
router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  validateAdminIdParam,
  deleteUser,
);

router.delete(
  "/lecturers/:id",
  requireAuth,
  requireRole("admin"),
  validateAdminIdParam,
  deleteLecturer,
);

// Schedules are cancelled, not hard-deleted, to preserve audit/history.
router.delete(
  "/lectures/:id",
  requireAuth,
  requireRole("admin"),
  validateAdminIdParam,
  deleteLecture,
);

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

// Create Course
router.post(
  "/courses",
  requireAuth,
  requireRole("admin"),
  validateCreateCourse,
  createCourse,
);

// Create Venue
router.post(
  "/venues",
  requireAuth,
  requireRole("admin"),
  validateCreateVenue,
  createVenue,
);

export default router;
