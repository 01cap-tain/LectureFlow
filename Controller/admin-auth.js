import argon2 from "argon2";
import pool from "../Database/db.js";
import { clearStudentLecturesCache } from "../Services/studentLectureCache.js";
import { clearVenueCache } from "../Services/venueCache.js";
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

async function listAdmins(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users
       WHERE role = 'admin'
       ORDER BY created_at DESC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, admins: result.rows });
  } catch (err) {
    console.error("listAdmins error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch admins" });
  }
}

async function listLecturers(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department_id,
              d.name AS department_name, u.is_active, u.created_at
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role = 'moderator'
       ORDER BY u.created_at DESC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, lecturers: result.rows });
  } catch (err) {
    console.error("listLecturers error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch lecturers" });
  }
}

async function listFaculties(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, is_active, created_at, updated_at
       FROM faculties
       ORDER BY name ASC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, faculties: result.rows });
  } catch (err) {
    console.error("listFaculties error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch faculties" });
  }
}

async function listDepartments(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.faculty_id, f.name AS faculty_name,
              d.is_active, d.created_at, d.updated_at
       FROM departments d
       JOIN faculties f ON f.id = d.faculty_id
       ORDER BY d.name ASC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, departments: result.rows });
  } catch (err) {
    console.error("listDepartments error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch departments" });
  }
}

async function listCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.course_code, c.title, c.department_id,
              d.name AS department_name, c.level, c.semester, c.type,
              c.academic_year, c.is_active, c.created_at, c.updated_at
       FROM courses c
       JOIN departments d ON d.id = c.department_id
       ORDER BY c.level ASC, c.course_code ASC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, courses: result.rows });
  } catch (err) {
    console.error("listCourses error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch courses" });
  }
}

async function listVenues(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, location, capacity, is_active, created_at, updated_at
       FROM venues
       ORDER BY name ASC`,
    );

    return res.status(200).json({ success: true, count: result.rows.length, venues: result.rows });
  } catch (err) {
    console.error("listVenues error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch venues" });
  }
}

async function deleteUser(req, res) {
  const userId = Number(req.params.id);

  try {
    if (userId === req.session.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // Soft delete keeps old lecture history and avoids foreign-key failures.
    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND role IN ('student', 'moderator') AND is_active = true
       RETURNING id, name, email, role, department_id, matric_no, is_active`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found or already inactive",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ success: false, message: "Could not deactivate user" });
  }
}

async function deleteLecturer(req, res) {
  const lecturerId = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND role = 'moderator' AND is_active = true
       RETURNING id, name, email, role, department_id, is_active`,
      [lecturerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecturer not found or already inactive",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lecturer deactivated successfully",
      lecturer: result.rows[0],
    });
  } catch (err) {
    console.error("deleteLecturer error:", err);
    return res.status(500).json({ success: false, message: "Could not deactivate lecturer" });
  }
}

async function deleteLecture(req, res) {
  const lectureId = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE lectures
       SET status = 'cancelled', updated_at = NOW()
       FROM courses c
       WHERE lectures.course_id = c.id
         AND lectures.id = $1
         AND lectures.status IN ('scheduled', 'postponed')
       RETURNING lectures.id, lectures.course_id, lectures.lecturer_id,
                 lectures.venue_id, lectures.department_id,
                 TO_CHAR(lectures.date, 'YYYY-MM-DD') AS date,
                 lectures.start_time, lectures.end_time, lectures.status,
                 lectures.notes, lectures.updated_at, c.level, c.semester`,
      [lectureId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or already inactive",
      });
    }

    await clearStudentLecturesCache({
      department_id: result.rows[0].department_id,
      level: result.rows[0].level,
      semester: result.rows[0].semester,
      dates: [result.rows[0].date],
    });
    await clearVenueCache({
      venue_ids: [result.rows[0].venue_id],
      dates: [result.rows[0].date],
    });

    return res.status(200).json({
      success: true,
      message: "Lecture cancelled successfully",
      lecture: result.rows[0],
    });
  } catch (err) {
    console.error("deleteLecture error:", err);
    return res.status(500).json({ success: false, message: "Could not cancel lecture" });
  }
}
export {
  createAdmin,
  createLecturer,
  createFaculty,
  createDepartment,
  createCourse,
  createVenue,
  listAdmins,
  listLecturers,
  listFaculties,
  listDepartments,
  listCourses,
  listVenues,
  deleteUser,
  deleteLecturer,
  deleteLecture,
};







