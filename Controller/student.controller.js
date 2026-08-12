import pool from "../Database/db.js";
import { getJsonCache, setJsonCache } from "../Services/cache.js";
import { getStudentLecturesCacheKey } from "../Services/studentLectureCache.js";
import { getVenueQueueCacheKey } from "../Services/venueCache.js";

const CACHE_TTL_SECONDS = Number(process.env.STUDENT_LECTURES_CACHE_TTL || 180);
const VENUE_QUEUE_CACHE_TTL = Number(process.env.VENUE_QUEUE_CACHE_TTL || 120);

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

export async function getStudentLectures(req, res) {
  try {
    const student = req.session.user;
    const { mode, date } = req.studentLectureQuery;
    const now = getCampusDateTime();

    if (!student.department_id || !student.level || !student.current_semester) {
      return res.status(400).json({
        success: false,
        message: "Complete your profile before viewing lectures",
      });
    }

    const cacheKey = getStudentLecturesCacheKey({
      department_id: student.department_id,
      level: student.level,
      semester: student.current_semester,
      mode,
      date,
    });

    const cached = await getJsonCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        ...cached,
      });
    }

    const values = [
      student.department_id,
      student.level,
      student.current_semester,
      now.date,
      now.time,
    ];

    let query = `
      SELECT
        l.id,
        TO_CHAR(l.date, 'YYYY-MM-DD') AS date,
        l.start_time,
        l.end_time,
        l.status,
        CASE
          WHEN l.status IN ('scheduled', 'postponed')
               AND l.date = $4::date
               AND l.start_time <= $5::time
               AND l.end_time > $5::time
          THEN 'ongoing'
          WHEN l.status IN ('scheduled', 'postponed')
               AND (l.date < $4::date OR (l.date = $4::date AND l.end_time < $5::time))
          THEN 'completed'
          ELSE l.status::text
        END AS live_status,
        c.course_code,
        c.title AS course_title,
        c.type AS course_type,
        u.name AS lecturer_name,
        v.id AS venue_id,
        v.name AS venue_name,
        v.location AS venue_location
      FROM lectures l
      JOIN courses c ON c.id = l.course_id
      JOIN users u ON u.id = l.lecturer_id
      JOIN venues v ON v.id = l.venue_id
      WHERE l.department_id = $1
        AND c.level = $2
        AND c.semester = $3
        AND l.status IN ('scheduled', 'postponed', 'cancelled')
    `;

    if (mode === "date") {
      values.push(date);
      query += ` AND l.date = $6::date`;
    } else {
      query += `
        AND (
          l.date > $4::date
          OR (l.date = $4::date AND (l.end_time > $5::time OR l.status = 'cancelled'))
        )
      `;
    }

    query += ` ORDER BY l.date ASC, l.start_time ASC LIMIT 50`;

    const result = await pool.query(query, values);
    const payload = {
      mode,
      date,
      count: result.rows.length,
      lectures: result.rows,
    };

    await setJsonCache(cacheKey, payload, CACHE_TTL_SECONDS);

    return res.status(200).json({
      success: true,
      source: "database",
      ...payload,
    });
  } catch (err) {
    console.error("getStudentLectures error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch lectures",
    });
  }
}

function minutesUntil(endTime, currentTime) {
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  const [currentHour, currentMinute] = String(currentTime).split(":").map(Number);
  const endTotal = endHour * 60 + endMinute;
  const currentTotal = currentHour * 60 + currentMinute;
  return Math.max(endTotal - currentTotal, 0);
}

export async function getVenueQueue(req, res) {
  try {
    const now = getCampusDateTime();
    const venue_id = req.venue_id;
    const selectedDate = req.venue_queue_date || now.date;
    const cacheKey = getVenueQueueCacheKey({ venue_id, date: selectedDate });

    const cached = await getJsonCache(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        source: "cache",
        ...cached,
      });
    }

    const venueResult = await pool.query(
      `SELECT id, name, location, capacity
       FROM venues
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [venue_id],
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Venue not found",
      });
    }

    const currentResult = await pool.query(
      `SELECT
         l.id,
         TO_CHAR(l.date, 'YYYY-MM-DD') AS date,
         l.start_time,
         l.end_time,
         l.status,
         c.course_code,
         c.title AS course_title,
         d.name AS department_name,
         u.name AS lecturer_name
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN departments d ON d.id = l.department_id
       JOIN users u ON u.id = l.lecturer_id
       WHERE l.venue_id = $1
         AND l.date = $2::date
         AND l.start_time <= $3::time
         AND l.end_time > $3::time
         AND l.status IN ('scheduled', 'postponed')
       ORDER BY l.start_time ASC
       LIMIT 1`,
      [venue_id, now.date, now.time],
    );

    const queueResult = await pool.query(
      `SELECT
         l.id,
         TO_CHAR(l.date, 'YYYY-MM-DD') AS date,
         l.start_time,
         l.end_time,
         l.status,
         CASE
           WHEN l.status = 'cancelled'
           THEN 'cancelled'
           WHEN l.date = $2::date
                AND l.start_time <= $3::time
                AND l.end_time > $3::time
           THEN 'ongoing'
           ELSE l.status::text
         END AS live_status,
         c.course_code,
         c.title AS course_title,
         c.level,
         c.semester,
         d.name AS department_name,
         u.name AS lecturer_name
       FROM lectures l
       JOIN courses c ON c.id = l.course_id
       JOIN departments d ON d.id = l.department_id
       JOIN users u ON u.id = l.lecturer_id
       WHERE l.venue_id = $1
         AND l.status IN ('scheduled', 'postponed', 'cancelled')
         AND l.date = $2::date
       ORDER BY l.date ASC, l.start_time ASC
       LIMIT 15`,
      [venue_id, selectedDate, now.time],
    );

    const currentLecture = currentResult.rows[0] || null;
    const venueStatus = currentLecture ? "occupied" : "free";

    const payload = {
      checked_at_date: now.date,
      checked_at_time: now.time,
      queue_date: selectedDate,
      venue: venueResult.rows[0],
      venue_status: venueStatus,
      remaining_minutes: currentLecture
        ? minutesUntil(currentLecture.end_time, now.time)
        : 0,
      current_lecture: currentLecture,
      count: queueResult.rows.length,
      lectures: queueResult.rows,
    };

    await setJsonCache(cacheKey, payload, VENUE_QUEUE_CACHE_TTL);

    return res.status(200).json({
      success: true,
      source: "database",
      ...payload,
    });
  } catch (err) {
    console.error("getVenueQueue error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch venue queue",
    });
  }
}



