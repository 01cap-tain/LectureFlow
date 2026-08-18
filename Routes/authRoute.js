import express from "express";
import {
  ForgotPassword,
  ResetPassword,
  SignUp,
  SignIn,
  SignOut,
} from "../Controller/user-auth.js";
import {
  validateForgotPassword,
  validateResetPassword,
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

// Public route: user is not logged in because they forgot their password.
router.post(
  "/forgot-password",
  authRateLimit,
  validateForgotPassword,
  ForgotPassword,
);

// Public route: user received a reset token by email and is setting a new password.
router.post(
  "/reset-password",
  authRateLimit,
  validateResetPassword,
  ResetPassword,
);

// Authenticated users only
router.post("/signout", requireAuth, SignOut);

export default router;
