import pool from "../Database/db.js";
/**
 * Get courses belonging to the logged-in lecturer's department
 * Used for the schedule lecture dropdown
 */
export async function getMyCourses(req, res) {
  try {
    const department_id = req.session.user.department_id;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "Lecturer is not assigned to any department",
      });
    }

    const result = await pool.query(
      `SELECT id, course_code, title, level, semester, type
       FROM courses
       WHERE department_id = $1
         AND is_active = true
       ORDER BY level ASC, course_code ASC`,
      [department_id],
    );

    return res.status(200).json({
      success: true,
      courses: result.rows,
    });
  } catch (err) {
    console.error("getMyCourses error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch courses",
    });
  }
}
