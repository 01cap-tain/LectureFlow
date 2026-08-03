import pool from "../Database/db.js";

/**
 * Schedule a new lecture (Moderator only)
 */
export async function scheduleLecture(req, res) {
  const lecturer_id = req.session.user.id;
  const department_id = req.session.user.department_id;

  const { course_id, venue_id, date, start_time, end_time, notes } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check course exists
    const courseCheck = await client.query(
      `SELECT id, department_id FROM courses 
       WHERE id = $1 AND is_active = true LIMIT 1`,
      [course_id],
    );

    if (courseCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive course",
      });
    }

    // Optional: Ensure course belongs to lecturer's department
    if (courseCheck.rows[0].department_id !== department_id) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You can only schedule courses from your department",
      });
    }

    // 2. Check venue exists and is active
    const venueCheck = await client.query(
      `SELECT id FROM venues 
       WHERE id = $1 AND is_active = true LIMIT 1`,
      [venue_id],
    );

    if (venueCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive venue",
      });
    }

    // 3. Conflict Detection
    const conflict = await client.query(
      `SELECT id, course_id, start_time, end_time
       FROM lectures
       WHERE venue_id = $1
         AND date = $2
         AND status IN ('scheduled', 'postponed')
         AND (
           (start_time, end_time) OVERLAPS ($3::time, $4::time)
         )
       LIMIT 1`,
      [venue_id, date, start_time, end_time],
    );

    if (conflict.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Venue is already booked for the selected time",
        conflict: conflict.rows[0],
      });
    }

    // 4. Insert the lecture
    const result = await client.query(
      `INSERT INTO lectures (
         course_id, lecturer_id, venue_id, department_id,
         date, start_time, end_time, status, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
       RETURNING *`,
      [
        course_id,
        lecturer_id,
        venue_id,
        department_id,
        date,
        start_time,
        end_time,
        notes,
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Lecture scheduled successfully",
      lecture: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("scheduleLecture error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not schedule lecture",
    });
  } finally {
    client.release();
  }
}

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

/**
 * Get all active venues
 * Used for the schedule lecture dropdown
 */
export async function getVenues(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, location, capacity
       FROM venues
       WHERE is_active = true
       ORDER BY name ASC`,
    );

    return res.status(200).json({
      success: true,
      venues: result.rows,
    });
  } catch (err) {
    console.error("getVenues error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch venues",
    });
  }
}

/**
 * Postpone a lecture
 * Only the lecturer who created it can postpone it
 */
export async function postponeLecture(req, res) {
  const lecturer_id = req.session.user.id;
  const lectureId = req.params.id;
  const { date, start_time, end_time, venue_id, notes } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check lecture exists and belongs to this lecturer
    const lectureCheck = await client.query(
      `SELECT * FROM lectures 
       WHERE id = $1 AND lecturer_id = $2 AND status IN ('scheduled', 'postponed')
       LIMIT 1`,
      [lectureId, lecturer_id],
    );

    if (lectureCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you don't have permission to modify it",
      });
    }

    const current = lectureCheck.rows[0];

    // Use existing values if not provided
    const newDate = date || current.date;
    const newStart = start_time || current.start_time;
    const newEnd = end_time || current.end_time;
    const newVenue = venue_id || current.venue_id;

    // 2. Conflict detection (only if time or venue changed)
    if (date || start_time || end_time || venue_id) {
      const conflict = await client.query(
        `SELECT id FROM lectures
         WHERE venue_id = $1
           AND date = $2
           AND id != $3
           AND status IN ('scheduled', 'postponed')
           AND (start_time, end_time) OVERLAPS ($4::time, $5::time)
         LIMIT 1`,
        [newVenue, newDate, lectureId, newStart, newEnd],
      );

      if (conflict.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Venue is already booked for the selected time",
        });
      }
    }

    // 3. Update the lecture
    const result = await client.query(
      `UPDATE lectures
       SET date = $1,
           start_time = $2,
           end_time = $3,
           venue_id = $4,
           notes = COALESCE($5, notes),
           status = 'postponed',
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newDate, newStart, newEnd, newVenue, notes, lectureId],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Lecture postponed successfully",
      lecture: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("postponeLecture error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not postpone lecture",
    });
  } finally {
    client.release();
  }
}

/**
 * Cancel a lecture
 * Only the lecturer who created it can cancel it
 */
export async function cancelLecture(req, res) {
  const lecturer_id = req.session.user.id;
  const lectureId = req.params.id;

  try {
    const result = await pool.query(
      `UPDATE lectures
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1 
         AND lecturer_id = $2 
         AND status IN ('scheduled', 'postponed')
       RETURNING *`,
      [lectureId, lecturer_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you don't have permission to cancel it",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lecture cancelled successfully",
      lecture: result.rows[0],
    });
  } catch (err) {
    console.error("cancelLecture error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not cancel lecture",
    });
  }
}
