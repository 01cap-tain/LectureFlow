import pool from "../Database/db.js";
import { clearStudentLecturesCache } from "../Services/studentLectureCache.js";
import { clearVenueCache } from "../Services/venueCache.js";

function getCampusDateTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIME_ZONE || "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function isPastLectureStart(date, start_time) {
  const now = getCampusDateTime();
  const lectureDate = typeof date === "string" ? date : date.toISOString().slice(0, 10);
  const lectureStart = String(start_time).slice(0, 5);

  return lectureDate < now.date || (lectureDate === now.date && lectureStart <= now.time.slice(0, 5));
}

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
      `SELECT id, department_id, level, semester FROM courses 
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
       RETURNING id, course_id, lecturer_id, venue_id, department_id,
                 TO_CHAR(date, 'YYYY-MM-DD') AS date,
                 start_time, end_time, status, notes, created_at, updated_at`,
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
    await clearStudentLecturesCache({
      department_id,
      level: courseCheck.rows[0].level,
      semester: courseCheck.rows[0].semester,
      dates: [date],
    });
    await clearVenueCache({
      venue_ids: [venue_id],
      dates: [date],
    });

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
 * Get current and upcoming lectures for one venue.
 * Used only after a moderator selects a venue on the schedule form.
 */
export async function getVenueQueueForModerator(req, res) {
  try {
    const venue_id = Number(req.params.venue_id);
    const now = getCampusDateTime();

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: "Valid venue_id is required",
      });
    }

    const result = await pool.query(
      `SELECT
         l.id,
         TO_CHAR(l.date, 'YYYY-MM-DD') AS date,
         l.start_time,
         l.end_time,
         l.status,
         CASE
           WHEN l.date = $2::date
                AND l.start_time <= $3::time
                AND l.end_time > $3::time
           THEN 'ongoing'
           ELSE l.status::text
         END AS live_status,
         c.course_code,
         c.title AS course_title,
         d.name AS department_name,
         u.name AS lecturer_name
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN departments d ON d.id = l.department_id
       JOIN users u ON u.id = l.lecturer_id
       WHERE l.venue_id = $1
         AND l.status IN ('scheduled', 'postponed')
         AND (
           l.date > $2::date
           OR (l.date = $2::date AND l.end_time > $3::time)
         )
       ORDER BY l.date ASC, l.start_time ASC
       LIMIT 15`,
      [venue_id, now.date, now.time],
    );

    const current_lecture =
      result.rows.find((lecture) => lecture.live_status === "ongoing") || null;

    return res.status(200).json({
      success: true,
      checked_at_date: now.date,
      checked_at_time: now.time,
      current_lecture,
      count: result.rows.length,
      lectures: result.rows,
    });
  } catch (err) {
    console.error("getVenueQueueForModerator error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch venue schedule",
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
      `SELECT l.*, c.level, c.semester
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1
         AND l.lecturer_id = $2
         AND l.status IN ('scheduled', 'postponed')
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

    // Recheck after merging old and new values, so partial postpone requests stay safe.
    if (isPastLectureStart(newDate, newStart)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Lecture start_time cannot already be in the past",
      });
    }

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
       RETURNING id, course_id, lecturer_id, venue_id, department_id,
                 TO_CHAR(date, 'YYYY-MM-DD') AS date,
                 start_time, end_time, status, notes, created_at, updated_at`,
      [newDate, newStart, newEnd, newVenue, notes, lectureId],
    );

    await client.query("COMMIT");
    await clearStudentLecturesCache({
      department_id: current.department_id,
      level: current.level,
      semester: current.semester,
      dates: [current.date, newDate],
    });
    await clearVenueCache({
      venue_ids: [current.venue_id, newVenue],
      dates: [current.date, newDate],
    });

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
       FROM courses c
       WHERE lectures.course_id = c.id
         AND lectures.id = $1
         AND lectures.lecturer_id = $2
         AND lectures.status IN ('scheduled', 'postponed')
       RETURNING lectures.id, lectures.course_id, lectures.lecturer_id,
                 lectures.venue_id, lectures.department_id,
                 TO_CHAR(lectures.date, 'YYYY-MM-DD') AS date,
                 lectures.start_time, lectures.end_time, lectures.status,
                 lectures.notes, lectures.created_at, lectures.updated_at,
                 c.level, c.semester`,
      [lectureId, lecturer_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you don't have permission to cancel it",
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
    console.error("cancelLecture error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not cancel lecture",
    });
  }
}

/**
 * Get lectures created by the logged-in lecturer
 * Adds live_status using the app timezone instead of the database timezone.
 */
export async function getMyLectures(req, res) {
  try {
    const lecturer_id = req.session.user.id;
    const { status, upcoming } = req.query;
    const now = getCampusDateTime();

    let query = `
      SELECT
         l.id,
         l.course_id,
         l.venue_id,
         TO_CHAR(l.date, 'YYYY-MM-DD') AS date,
         l.start_time,
         l.end_time,
         l.status,
         CASE
           WHEN l.status IN ('scheduled', 'postponed')
                AND l.date = $2::date
                AND l.start_time <= $3::time
                AND l.end_time > $3::time
           THEN 'ongoing'
           WHEN l.status IN ('scheduled', 'postponed')
                AND (l.date < $2::date OR (l.date = $2::date AND l.end_time < $3::time))
           THEN 'completed'
           ELSE l.status::text
         END AS live_status,
         l.notes,
         l.created_at,
         l.updated_at,
         c.course_code,
         c.title AS course_title,
         v.name AS venue_name,
         v.location AS venue_location
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN venues v ON v.id = l.venue_id
       WHERE l.lecturer_id = $1
    `;

    const values = [lecturer_id, now.date, now.time];
    let paramIndex = 4;

    if (status) {
      const allowedStatuses = [
        "scheduled",
        "postponed",
        "cancelled",
        "completed",
      ];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
        });
      }

      if (status === "completed") {
        query += `
          AND (
            l.status = 'completed'
            OR (
              l.status IN ('scheduled', 'postponed')
              AND (l.date < $2::date OR (l.date = $2::date AND l.end_time < $3::time))
            )
          )
        `;
      } else {
        query += ` AND l.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }
    }

    if (upcoming === "true") {
      query += `
        AND (
          l.date > $2::date
          OR (l.date = $2::date AND l.end_time > $3::time)
        )
        AND l.status IN ('scheduled', 'postponed')
      `;
    }

    query += ` ORDER BY l.date DESC, l.start_time DESC`;

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      checked_at_date: now.date,
      checked_at_time: now.time,
      count: result.rows.length,
      lectures: result.rows,
    });
  } catch (err) {
    console.error("getMyLectures error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch lectures",
    });
  }
}





