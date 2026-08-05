import argon2 from "argon2";
import pool from "../Database/db.js";
import { resolveDepartmentFromMatric } from "../Services/departmentFromMatric.js";

// AUTH CONTROLLER: student SignUp uses DB transaction + department from matric
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

  // 1. Resolve department from matric number early
  const resolved = resolveDepartmentFromMatric(matric_no);

  if (!resolved) {
    return res.status(400).json({
      success: false,
      message:
        "Could not detect department from matric number. Please check your matric number.",
    });
  }

  const department_name = resolved.name;

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

    // 3. Check if department already exists (Admin must have created it)
    const deptResult = await client.query(
      `SELECT id, name
       FROM departments
       WHERE LOWER(name) = LOWER($1) AND is_active = TRUE
       LIMIT 1`,
      [department_name],
    );

    if (deptResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Department "${department_name}" is not set up yet. Please contact admin.`,
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

export { SignUp, SignIn, SignOut };



