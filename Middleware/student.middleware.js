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

export function validateGetStudentLectures(req, res, next) {
  try {
    const date = typeof req.query?.date === "string" ? req.query.date.trim() : "";
    const upcoming =
      typeof req.query?.upcoming === "string" ? req.query.upcoming.trim() : "";
    const errors = [];

    if (date && date !== "today") {
      const validDate = validator.isDate(date, {
        format: "YYYY-MM-DD",
        strictMode: true,
      });

      if (!validDate) {
        errors.push("date must be 'today' or YYYY-MM-DD");
      }
    }

    if (upcoming && !["true", "false"].includes(upcoming)) {
      errors.push("upcoming must be true or false");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.studentLectureQuery = {
      mode: date || upcoming === "false" ? "date" : "upcoming",
      date: date === "today" || !date ? getTodayDate() : date,
    };

    next();
  } catch (err) {
    console.error("validateGetStudentLectures error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}
export function validateVenueIdParam(req, res, next) {
  try {
    const venue_id = Number(req.params?.venue_id);

    if (!Number.isInteger(venue_id) || venue_id < 1) {
      return res.status(400).json({
        success: false,
        errors: ["venue_id must be a positive number"],
      });
    }

    req.venue_id = venue_id;
    next();
  } catch (err) {
    console.error("validateVenueIdParam error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}

