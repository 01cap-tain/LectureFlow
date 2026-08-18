import argon2 from "argon2";
import pool from "../Database/db.js";

/**
 * Get current user profile
 */
export async function getMyProfile(req, res) {
  try {
    const userId = req.session.user.id;

    const result = await pool.query(
      `SELECT users.id, users.name, users.email, users.role,
              users.department_id, departments.name AS department_name,
              users.matric_no, users.level, users.current_semester,
              users.phone, users.is_active, users.created_at
       FROM users
       LEFT JOIN departments ON departments.id = users.department_id
       WHERE users.id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch profile",
    });
  }
}

/**
 * Complete Profile (first time after signup)
 */
export async function completeProfile(req, res) {
  const userId = req.session.user.id;
  const { name, level, current_semester } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           level = $2,
           current_semester = $3,
           updated_at = NOW()
       WHERE id = $4 AND role = 'student'
       RETURNING id, name, email, role, department_id, matric_no,
                 level, current_semester, phone, is_active`,
      [name, level, current_semester, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Update session with new data
    req.session.user.name = name;
    req.session.user.level = level;
    req.session.user.current_semester = current_semester;

    return res.status(200).json({
      success: true,
      message: "Profile completed successfully",
      profile: result.rows[0],
    });
  } catch (err) {
    console.error("completeProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not complete profile",
    });
  }
}

/**
 * Update Profile later
 */
export async function updateProfile(req, res) {
  const userId = req.session.user.id;
  const { name, email, level, current_semester, phone } = req.body;

  try {
    const fields = [];
    const values = [];
    let index = 1;

    if (name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(name);
    }
    if (email !== undefined) {
      fields.push(`email = $${index++}`);
      values.push(email);
    }
    if (level !== undefined) {
      fields.push(`level = $${index++}`);
      values.push(level);
    }
    if (current_semester !== undefined) {
      fields.push(`current_semester = $${index++}`);
      values.push(current_semester);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(phone || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE id = $${index}
       RETURNING id, name, email, role, department_id, matric_no,
                 level, current_semester, phone, is_active`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update session
    const updated = result.rows[0];
    req.session.user.name = updated.name;
    req.session.user.email = updated.email;
    req.session.user.level = updated.level;
    req.session.user.current_semester = updated.current_semester;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updated,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email is already in use",
      });
    }

    console.error("updateProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not update profile",
    });
  }
}

/**
 * Reset/change password for a logged-in user from their profile page.
 */
export async function resetProfilePassword(req, res) {
  const userId = req.session.user.id;
  const { current_password, new_password } = req.body;

  try {
    const result = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const valid = await argon2.verify(
      result.rows[0].password_hash,
      current_password,
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const password_hash = await argon2.hash(new_password);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [password_hash, userId],
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("resetProfilePassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not update password",
    });
  }
}
