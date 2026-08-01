import validator from "validator";

/**
 * Validate Complete Profile (first time)
 */
export function validateCompleteProfile(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const level = req.body?.level;
    const current_semester = req.body?.current_semester;

    const errors = [];

    if (!name || name.length < 2 || name.length > 100) {
      errors.push("Name must be between 2 and 100 characters");
    }

    if (![100, 200, 300, 400, 500].includes(Number(level))) {
      errors.push("Level must be one of: 100, 200, 300, 400, 500");
    }

    if (![1, 2].includes(Number(current_semester))) {
      errors.push("Current semester must be 1 or 2");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.name = name;
    req.body.level = Number(level);
    req.body.current_semester = Number(current_semester);

    next();
  } catch (err) {
    console.error("validateCompleteProfile error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Update Profile
 */
export function validateUpdateProfile(req, res, next) {
  try {
    const name = req.body?.name;
    const level = req.body?.level;
    const current_semester = req.body?.current_semester;
    const phone = req.body?.phone;

    const errors = [];

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        errors.push("Name must be between 2 and 100 characters");
      } else {
        req.body.name = name.trim();
      }
    }

    if (
      level !== undefined &&
      ![100, 200, 300, 400, 500].includes(Number(level))
    ) {
      errors.push("Level must be one of: 100, 200, 300, 400, 500");
    }

    if (
      current_semester !== undefined &&
      ![1, 2].includes(Number(current_semester))
    ) {
      errors.push("Current semester must be 1 or 2");
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (!validator.isMobilePhone(String(phone), "any")) {
        errors.push("Invalid phone number");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    next();
  } catch (err) {
    console.error("validateUpdateProfile error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}
