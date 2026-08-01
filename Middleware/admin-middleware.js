import validator from "validator";

/**
 * Validate Create Admin
 */
export function validateCreateAdmin(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    const errors = [];

    if (!name || name.length < 2 || name.length > 100) {
      errors.push("Name must be between 2 and 100 characters");
    }

    if (!email) {
      errors.push("Email is required");
    } else if (!validator.isEmail(email)) {
      errors.push("Invalid email address");
    }

    if (!password) {
      errors.push("Password is required");
    } else {
      const strong = validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      });
      if (!strong) {
        errors.push(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number",
        );
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.name = name;
    req.body.email = validator.normalizeEmail(email) || email.toLowerCase();
    req.body.password = password;

    next();
  } catch (err) {
    console.error("validateCreateAdmin error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Create Lecturer (Moderator)
 */
export function validateCreateLecturer(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const department_id = req.body?.department_id;

    const errors = [];

    if (!name || name.length < 2 || name.length > 100) {
      errors.push("Name must be between 2 and 100 characters");
    }

    if (!email || !validator.isEmail(email)) {
      errors.push("Valid email is required");
    }

    if (!password) {
      errors.push("Password is required");
    } else {
      const strong = validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 0,
      });
      if (!strong) {
        errors.push(
          "Password must be at least 8 characters and include uppercase, lowercase, and a number",
        );
      }
    }

    if (!department_id) {
      errors.push("Department is required");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.name = name;
    req.body.email = validator.normalizeEmail(email) || email.toLowerCase();
    req.body.password = password;

    next();
  } catch (err) {
    console.error("validateCreateLecturer error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Create Faculty
 */
export function validateCreateFaculty(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name || name.length < 2 || name.length > 150) {
      return res.status(400).json({
        success: false,
        errors: ["Faculty name must be between 2 and 150 characters"],
      });
    }

    req.body.name = name;
    next();
  } catch (err) {
    console.error("validateCreateFaculty error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Create Department
 */
export function validateCreateDepartment(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const faculty_id = req.body?.faculty_id;

    const errors = [];

    if (!name || name.length < 2 || name.length > 150) {
      errors.push("Department name must be between 2 and 150 characters");
    }

    if (!faculty_id) {
      errors.push("Faculty is required");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.name = name;
    next();
  } catch (err) {
    console.error("validateCreateDepartment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}
