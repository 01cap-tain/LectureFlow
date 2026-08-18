import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import pool from "../Database/db.js";
import { extractDepartmentCodeFromMatric } from "../Services/departmentFromMatric.js";
import { deleteCacheKeys, getJsonCache, setJsonCache } from "../Services/cache.js";
import { sendPasswordResetEmail } from "../Services/email.service.js";

// AUTH CONTROLLER: student SignUp uses DB transaction + department from matric
const PASSWORD_RESET_TTL_SECONDS = Number(
  process.env.PASSWORD_RESET_TTL_SECONDS,
);
const FORGOT_PASSWORD_MESSAGE =
  "If the email exists, a password reset link has been sent.";

function hashResetToken(token) {
  // Store only token hash in Valkey; plain token is sent by email only.
  return createHash("sha256").update(token).digest("hex");
}

function buildResetUrl(token) {
  const baseUrl = process.env.RESET_PASSWORD_URL || process.env.CLIENT_URL;
  if (!baseUrl) return null;

  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Safe user payload cached on the session (never includes password_hash).
 * Available after sign-in as req.session.user
 */
function buildSessionUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department_id: row.department_id,
    matric_no: row.matric_no,
    level: row.level,
    current_semester: row.current_semester,
    is_active: row.is_active,
  };
}

/**
 * Cache authenticated user on the session for later requests.
 * Regenerates session id to reduce fixation risk.
 */
function cacheSessionUser(req, sessionUser) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = sessionUser;
      req.session.save((saveErr) => {
        if (saveErr) return reject(saveErr);
        resolve();
      });
    });
  });
}

/**
 * Destroy session cache and clear cookie (name matches server session config).
 */
function destroySessionCache(req, res) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      res.clearCookie("lectureflow.sid");
      return resolve();
    }

    req.session.destroy((err) => {
      if (err) return reject(err);
      res.clearCookie("lectureflow.sid");
      resolve();
    });
  });
}

/**
 * Student-only registration.
 * Body (validated): email, matric_no, password
 * department_name comes from matric code (middleware).
 *
 * Uses a DB transaction: resolve department -> ensure unique -> insert student.
 * Role is always 'student'. Departments must already exist (admin-seeded).
 */
async function SignUp(req, res) {
  const { email, matric_no, password } = req.body;

  // 1. Extract matric department code; DB stores the actual code -> department mapping.
  const department_code = extractDepartmentCodeFromMatric(matric_no);

  if (!department_code) {
    return res.status(400).json({
      success: false,
      message:
        "Could not detect department code from matric number. Please check your matric number.",
    });
  }

  // 2. Hash password outside transaction
  let password_hash;
  try {
    password_hash = await argon2.hash(password);
  } catch (err) {
    console.error("SignUp hash error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create account",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 3. Resolve matric code to an active department created by admin.
    const deptResult = await client.query(
      `SELECT d.id, d.name
       FROM department_matric_codes dmc
       JOIN departments d ON d.id = dmc.department_id
       WHERE dmc.code = $1
         AND dmc.is_active = TRUE
         AND d.is_active = TRUE
       LIMIT 1`,
      [department_code],
    );

    if (deptResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Department code "${department_code}" is not set up yet. Please contact admin.`,
      });
    }

    const department_id = deptResult.rows[0].id;

    // 4. Uniqueness checks
    const existing = await client.query(
      `SELECT id, email, matric_no
       FROM users
       WHERE email = $1 OR matric_no = $2
       LIMIT 1
       FOR UPDATE`,
      [email, matric_no],
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      const row = existing.rows[0];

      if (row.email === email) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
      }
      return res.status(409).json({
        success: false,
        message: "Matric number is already registered",
      });
    }

    // 5. Insert student
    const result = await client.query(
      `INSERT INTO users (email, matric_no, password_hash, role, department_id)
       VALUES ($1, $2, $3, 'student', $4)
       RETURNING id, name, email, role, department_id, matric_no,
                 level, current_semester, is_active, created_at`,
      [email, matric_no, password_hash, department_id],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please sign in.",
      department: {
        id: department_id,
        name: deptResult.rows[0].name,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("SignUp rollback error:", rollbackErr);
    }

    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or matric number is already registered",
      });
    }

    console.error("SignUp error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create account",
    });
  } finally {
    client.release();
  }
}
/**
 * Sign-in for all roles.
 *
 * Student  -> body: { matric_no, password }  (login_as: 'student')
 * Staff    -> body: { email, password }      (login_as: 'staff' -> admin | moderator)
 *
 * On success, caches user details on req.session.user
 */
async function SignIn(req, res) {
  const { login_as, email, matric_no, password } = req.body;

  try {
    let result;

    if (login_as === "student") {
      result = await pool.query(
        `SELECT id, name, email, password_hash, role, department_id,
                matric_no, level, current_semester, is_active
         FROM users
         WHERE matric_no = $1 AND role = 'student'
         LIMIT 1`,
        [matric_no],
      );
    } else {
      result = await pool.query(
        `SELECT id, name, email, password_hash, role, department_id,
                matric_no, level, current_semester, is_active
         FROM users
         WHERE email = $1 AND role IN ('admin', 'moderator')
         LIMIT 1`,
        [email],
      );
    }

    const invalidMsg =
      login_as === "student"
        ? "Invalid matric number or password"
        : "Invalid email or password";

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: invalidMsg,
      });
    }

    const row = result.rows[0];

    if (!row.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    const valid = await argon2.verify(row.password_hash, password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: invalidMsg,
      });
    }

    const sessionUser = buildSessionUser(row);
    await cacheSessionUser(req, sessionUser);

    await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [
      row.id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Signed in successfully",
      user: sessionUser,
    });
  } catch (err) {
    console.error("SignIn error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not sign in",
    });
  }
}

/**
 * Start password reset. This route is public and does not require login.
 */
async function ForgotPassword(req, res) {
  const { email } = req.body;

  try {
    const result = await pool.query(
      `SELECT id, email
       FROM users
       WHERE email = $1 AND is_active = true
       LIMIT 1`,
      [email],
    );

    // Generic response prevents registered-email guessing.
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: FORGOT_PASSWORD_MESSAGE,
      });
    }

    const user = result.rows[0];
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const cacheKey = `password-reset:token:${tokenHash}`;
    const resetUrl = buildResetUrl(token);

    if (!resetUrl) {
      console.error(
        "ForgotPassword error: RESET_PASSWORD_URL or CLIENT_URL is required",
      );
      return res.status(500).json({
        success: false,
        message: "Could not send password reset email",
      });
    }

    const stored = await setJsonCache(
      cacheKey,
      { user_id: user.id, email: user.email },
      PASSWORD_RESET_TTL_SECONDS,
    );

    if (!stored) {
      return res.status(500).json({
        success: false,
        message: "Could not create password reset token",
      });
    }

    try {
      await sendPasswordResetEmail({
        email: user.email,
        expiresInMinutes: Math.floor(PASSWORD_RESET_TTL_SECONDS / 60),
        resetUrl,
      });
    } catch (emailErr) {
      await deleteCacheKeys([cacheKey]);
      console.error("ForgotPassword email error:", emailErr.message);
      return res.status(500).json({
        success: false,
        message: "Could not send password reset email",
      });
    }

    return res.status(200).json({
      success: true,
      message: FORGOT_PASSWORD_MESSAGE,
    });
  } catch (err) {
    console.error("ForgotPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not process password reset request",
    });
  }
}

/**
 * Complete forgot-password reset using the one-time token sent by email.
 */
async function ResetPassword(req, res) {
  const { token, password } = req.body;

  try {
    const tokenHash = hashResetToken(token);
    const cacheKey = `password-reset:token:${tokenHash}`;
    const resetData = await getJsonCache(cacheKey);

    if (!resetData?.user_id) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired",
      });
    }

    const password_hash = await argon2.hash(password);

    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2 AND is_active = true
       RETURNING id`,
      [password_hash, resetData.user_id],
    );

    await deleteCacheKeys([cacheKey]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please sign in.",
    });
  } catch (err) {
    console.error("ResetPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not reset password",
    });
  }
}
/**
 * Sign out any role: destroy session cache and clear cookie.
 */
async function SignOut(req, res) {
  try {
    await destroySessionCache(req, res);

    return res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (err) {
    console.error("SignOut error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not sign out",
    });
  }
}

export { ForgotPassword, ResetPassword, SignUp, SignIn, SignOut };
