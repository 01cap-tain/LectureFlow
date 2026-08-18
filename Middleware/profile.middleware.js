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
    const email = req.body?.email;
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

    if (email !== undefined) {
      if (typeof email !== "string" || !validator.isEmail(email.trim())) {
        errors.push("Valid email is required");
      } else {
        req.body.email = email.trim().toLowerCase();
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

/**
 * Validate logged-in password reset/change from the profile page.
 */
export function validateProfilePasswordReset(req, res, next) {
  try {
    const current_password =
      typeof req.body?.current_password === "string"
        ? req.body.current_password
        : "";
    const new_password =
      typeof req.body?.new_password === "string" ? req.body.new_password : "";

    const errors = [];

    if (!current_password) {
      errors.push("Current password is required");
    }

    const strong = validator.isStrongPassword(new_password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    });

    if (!new_password) {
      errors.push("New password is required");
    } else if (!strong) {
      errors.push(
        "New password must be at least 8 characters and include uppercase, lowercase, and a number",
      );
    } else if (!validator.isLength(new_password, { max: 128 })) {
      errors.push("New password must be at most 128 characters");
    }

    if (current_password && new_password && current_password === new_password) {
      errors.push("New password must be different from current password");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.current_password = current_password;
    req.body.new_password = new_password;
    return next();
  } catch (err) {
    console.error("validateProfilePasswordReset error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}
