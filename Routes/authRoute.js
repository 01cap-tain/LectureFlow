import express from "express";
import { SignUp, SignIn, SignOut } from "../Controller/user-auth.js";
import {
  validateSignUp,
  validateSignIn,
  requireAuth,
} from "../Middleware/user-middleware.js";
import { authRateLimit } from "../Middleware/rate-limit.middleware.js";

const router = express.Router();

// Student registration only (role forced to 'student' in controller)
router.post("/signup", authRateLimit, validateSignUp, SignUp);

// All roles: admin | moderator | student
router.post("/signin", authRateLimit, validateSignIn, SignIn);

// Authenticated users only
router.post("/signout", requireAuth, SignOut);

export default router;
