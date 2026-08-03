import argon2 from "argon2";
import pool from "../Database/db.js";

/**
 * Create a new Admin
 * Only existing Admin can call this
 */
async function createAdmin(req, res) {
  const { name, email, password } = req.body;

  try {
    const password_hash = await argon2.hash(password);

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, password_hash],
    );

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: result.rows[0],
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create admin",
    });
  }
}

/**
 * Create a new Lecturer (Moderator)
 */
async function createLecturer(req, res) {
  const { name, email, password, department_id } = req.body;

  try {
    const password_hash = await argon2.hash(password);

    // Check if department exists
    const deptCheck = await pool.query(
      `SELECT id FROM departments WHERE id = $1 AND is_active = true LIMIT 1`,
      [department_id],
    );

    if (deptCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive department",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department_id, is_active)
       VALUES ($1, $2, $3, 'moderator', $4, true)
       RETURNING id, name, email, role, department_id, is_active, created_at`,
      [name, email, password_hash, department_id],
    );

    return res.status(201).json({
      success: true,
      message: "Lecturer created successfully",
      lecturer: result.rows[0],
    });
  } catch (err) {
    console.error("createLecturer error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create lecturer",
    });
  }
}

/**
 * Create Faculty
 */
async function createFaculty(req, res) {
  const { name } = req.body;

  try {
    const existing = await pool.query(
      `SELECT id FROM faculties WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Faculty already exists",
      });
    }

    const result = await pool.query(
      `INSERT INTO faculties (name, is_active)
       VALUES ($1, true)
       RETURNING id, name, is_active, created_at`,
      [name],
    );

    return res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      faculty: result.rows[0],
    });
  } catch (err) {
    console.error("createFaculty error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create faculty",
    });
  }
}

/**
 * Create Department
 */
async function createDepartment(req, res) {
  const { name, faculty_id } = req.body;

  try {
    // Check faculty exists
    const facultyCheck = await pool.query(
      `SELECT id FROM faculties WHERE id = $1 AND is_active = true LIMIT 1`,
      [faculty_id],
    );

    if (facultyCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive faculty",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM departments WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    const result = await pool.query(
      `INSERT INTO departments (name, faculty_id, is_active)
       VALUES ($1, $2, true)
       RETURNING id, name, faculty_id, is_active, created_at`,
      [name, faculty_id],
    );

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department: result.rows[0],
    });
  } catch (err) {
    console.error("createDepartment error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create department",
    });
  }
}

/**
 * Create a new Course (Admin only)
 */
async function createCourse(req, res) {
  const {
    course_code,
    title,
    department_id,
    level,
    semester,
    type,
    academic_year,
  } = req.body;

  try {
    // Check department exists
    const deptCheck = await pool.query(
      `SELECT id FROM departments WHERE id = $1 AND is_active = true LIMIT 1`,
      [department_id],
    );

    if (deptCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive department",
      });
    }

    // Check for duplicate course code in the same academic year + semester
    const existing = await pool.query(
      `SELECT id FROM courses 
       WHERE course_code = $1 AND academic_year = $2 AND semester = $3
       LIMIT 1`,
      [course_code, academic_year, semester],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Course already exists for this academic year and semester",
      });
    }

    const result = await pool.query(
      `INSERT INTO courses (
         course_code, title, department_id, level, semester, type, academic_year, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [course_code, title, department_id, level, semester, type, academic_year],
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: result.rows[0],
    });
  } catch (err) {
    console.error("createCourse error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create course",
    });
  }
}

/**
 * Create a new Venue (Admin only)
 */
async function createVenue(req, res) {
  const { name, location, capacity } = req.body;

  try {
    // Check if venue name already exists
    const existing = await pool.query(
      `SELECT id FROM venues WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name],
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Venue name already exists",
      });
    }

    const result = await pool.query(
      `INSERT INTO venues (name, location, capacity, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, location, capacity],
    );

    return res.status(201).json({
      success: true,
      message: "Venue created successfully",
      venue: result.rows[0],
    });
  } catch (err) {
    console.error("createVenue error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create venue",
    });
  }
}
export {
  createAdmin,
  createLecturer,
  createFaculty,
  createDepartment,
  createCourse,
  createVenue,
};
