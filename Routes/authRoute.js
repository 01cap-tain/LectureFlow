import express from "express";
import { SignUp, SignIn, SignOut } from "../Controller/user-auth.js";
import {
  validateSignUp,
  validateSignIn,
  requireAuth,
  requireRole,
} from "../Middleware/user-middleware.js";

const router = express.Router();

// Student registration only (role forced to 'student' in controller)
router.post("/signup", validateSignUp, SignUp);

// All roles: admin | moderator | student
router.post("/signin", validateSignIn, SignIn);

// Authenticated users only
router.post("/signout", requireAuth, SignOut);

export default router;
