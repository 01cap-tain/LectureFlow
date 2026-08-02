import validator from "validator";

/**
 * Validate Schedule Lecture
 */
export function validateScheduleLecture(req, res, next) {
  try {
    const course_id = req.body?.course_id;
    const venue_id = req.body?.venue_id;
    const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
    const start_time =
      typeof req.body?.start_time === "string"
        ? req.body.start_time.trim()
        : "";
    const end_time =
      typeof req.body?.end_time === "string" ? req.body.end_time.trim() : "";
    const notes =
      typeof req.body?.notes === "string" ? req.body.notes.trim() : null;

    const errors = [];

    // course_id
    if (!course_id || isNaN(Number(course_id))) {
      errors.push("Valid course_id is required");
    }

    // venue_id
    if (!venue_id || isNaN(Number(venue_id))) {
      errors.push("Valid venue_id is required");
    }

    // date (YYYY-MM-DD)
    if (!date) {
      errors.push("Date is required");
    } else if (
      !validator.isDate(date, { format: "YYYY-MM-DD", strictMode: true })
    ) {
      errors.push("Date must be in YYYY-MM-DD format");
    }

    // start_time & end_time (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!start_time || !timeRegex.test(start_time)) {
      errors.push("start_time must be in HH:mm format (e.g. 09:00)");
    }

    if (!end_time || !timeRegex.test(end_time)) {
      errors.push("end_time must be in HH:mm format (e.g. 11:00)");
    }

    // Check that end_time is after start_time
    if (
      start_time &&
      end_time &&
      timeRegex.test(start_time) &&
      timeRegex.test(end_time)
    ) {
      if (start_time >= end_time) {
        errors.push("end_time must be after start_time");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Normalize
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
