import validator from "validator";

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIME_ZONE || "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseLectureTime(value) {
  if (typeof value !== "string") return null;

  const time = value.trim().toLowerCase().replace(/\s+/g, "");
  const twentyFourHour = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (twentyFourHour) {
    return `${twentyFourHour[1]}:${twentyFourHour[2]}`;
  }

  const twelveHour = time.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?(am|pm)$/);

  if (!twelveHour) return null;

  let hour = Number(twelveHour[1]);
  const minute = twelveHour[2] || "00";
  const meridiem = twelveHour[3];

  if (meridiem === "am" && hour === 12) hour = 0;
  if (meridiem === "pm" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function isSameDayPastTime(date, end_time) {
  if (date !== getTodayDate()) return false;

  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIME_ZONE || "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const values = Object.fromEntries(nowParts.map((part) => [part.type, part.value]));
  const currentTime = `${values.hour}:${values.minute}`;

  return end_time <= currentTime;
}

/**
 * Validate Schedule Lecture
 */
export function validateScheduleLecture(req, res, next) {
  try {
    const course_id = req.body?.course_id;
    const venue_id = req.body?.venue_id;
    const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
    const start_time = parseLectureTime(req.body?.start_time);
    const end_time = parseLectureTime(req.body?.end_time);
    const notes =
      typeof req.body?.notes === "string" ? req.body.notes.trim() : null;

    const errors = [];

    if (!course_id || isNaN(Number(course_id))) {
      errors.push("Valid course_id is required");
    }

    if (!venue_id || isNaN(Number(venue_id))) {
      errors.push("Valid venue_id is required");
    }

    if (!date) {
      errors.push("Date is required");
    } else if (
      !validator.isDate(date, { format: "YYYY-MM-DD", strictMode: true })
    ) {
      errors.push("Date must be in YYYY-MM-DD format");
    }

    if (!start_time) {
      errors.push("start_time must be valid (e.g. 2pm, 2:30pm, or 14:30)");
    }

    if (!end_time) {
      errors.push("end_time must be valid (e.g. 3pm, 3:30pm, or 15:30)");
    }

    if (start_time && end_time && start_time >= end_time) {
      errors.push("end_time must be after start_time");
    }

    if (date && end_time && isSameDayPastTime(date, end_time)) {
      errors.push("Lecture end_time cannot already be in the past for today");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.course_id = Number(course_id);
    req.body.venue_id = Number(venue_id);
    req.body.date = date;
    req.body.start_time = start_time;
    req.body.end_time = end_time;
    req.body.notes = notes || null;

    next();
  } catch (err) {
    console.error("validateScheduleLecture error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}

/**
 * Validate Postpone Lecture
 */
export function validatePostponeLecture(req, res, next) {
  try {
    const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
    const start_time =
      req.body?.start_time !== undefined ? parseLectureTime(req.body.start_time) : null;
    const end_time =
      req.body?.end_time !== undefined ? parseLectureTime(req.body.end_time) : null;
    const venue_id = req.body?.venue_id;
    const notes =
      typeof req.body?.notes === "string" ? req.body.notes.trim() : null;

    const errors = [];

    if (!date && !start_time && !end_time && !venue_id && notes === null) {
      errors.push(
        "Provide at least one field to update (date, time, venue, or notes)",
      );
    }

    if (
      date &&
      !validator.isDate(date, { format: "YYYY-MM-DD", strictMode: true })
    ) {
      errors.push("Date must be in YYYY-MM-DD format");
    }

    if (req.body?.start_time !== undefined && !start_time) {
      errors.push("start_time must be valid (e.g. 2pm, 2:30pm, or 14:30)");
    }

    if (req.body?.end_time !== undefined && !end_time) {
      errors.push("end_time must be valid (e.g. 3pm, 3:30pm, or 15:30)");
    }

    if (start_time && end_time && start_time >= end_time) {
      errors.push("end_time must be after start_time");
    }

    if (venue_id && isNaN(Number(venue_id))) {
      errors.push("venue_id must be a valid number");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    if (date) req.body.date = date;
    if (start_time) req.body.start_time = start_time;
    if (end_time) req.body.end_time = end_time;
    if (venue_id) req.body.venue_id = Number(venue_id);
    if (notes !== null) req.body.notes = notes || null;

    next();
  } catch (err) {
    console.error("validatePostponeLecture error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}
