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

/**
 * Validate Create Course
 */
export function validateCreateCourse(req, res, next) {
  try {
    const course_code =
      typeof req.body?.course_code === "string"
        ? req.body.course_code.trim()
        : "";
    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const department_id = req.body?.department_id;
    const level = req.body?.level;
    const semester = req.body?.semester;
    const type =
      typeof req.body?.type === "string" ? req.body.type.trim() : "core";
    const academic_year =
      typeof req.body?.academic_year === "string"
        ? req.body.academic_year.trim()
        : "";

    const errors = [];

    if (!course_code || course_code.length < 3) {
      errors.push("Course code is required (e.g. CSC 301)");
    }

    if (!title || title.length < 3) {
      errors.push("Course title is required");
    }

    if (!department_id || isNaN(Number(department_id))) {
      errors.push("Valid department_id is required");
    }

    if (![100, 200, 300, 400, 500, 600].includes(Number(level))) {
      errors.push("Level must be one of: 100, 200, 300, 400, 500, 600");
    }

    if (![1, 2].includes(Number(semester))) {
      errors.push("Semester must be 1 or 2");
    }

    if (!academic_year) {
      errors.push("Academic year is required (e.g. 2025/2026)");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.course_code = course_code.toUpperCase();
    req.body.title = title;
    req.body.department_id = Number(department_id);
    req.body.level = Number(level);
    req.body.semester = Number(semester);
    req.body.type = type || "core";
    req.body.academic_year = academic_year;

    next();
  } catch (err) {
    console.error("validateCreateCourse error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Create Venue
 */
export function validateCreateVenue(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const location =
      typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const capacity = req.body?.capacity;

    const errors = [];

    if (!name || name.length < 2) {
      errors.push("Venue name is required");
    }

    if (!location || location.length < 2) {
      errors.push("Location is required");
    }

    if (!capacity || isNaN(Number(capacity)) || Number(capacity) < 1) {
      errors.push("Capacity must be a positive number");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.name = name;
    req.body.location = location;
    req.body.capacity = Number(capacity);

    next();
  } catch (err) {
    console.error("validateCreateVenue error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}

/**
 * Validate Create Department Matric Code
 */
export function validateCreateDepartmentMatricCode(req, res, next) {
  try {
    const department_id = req.body?.department_id;
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const errors = [];

    if (!department_id || isNaN(Number(department_id))) {
      errors.push("Valid department_id is required");
    }

    if (!code || !validator.isAlphanumeric(code) || code.length > 20) {
      errors.push("Code must be letters/numbers only and at most 20 characters");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.department_id = Number(department_id);
    req.body.code = code.toUpperCase();
    next();
  } catch (err) {
    console.error("validateCreateDepartmentMatricCode error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}
/**
 * Validate numeric id params used by admin delete routes.
 */
export function validateAdminIdParam(req, res, next) {
  try {
    const id = Number(req.params?.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        errors: ["id must be a positive number"],
      });
    }

    next();
  } catch (err) {
    console.error("validateAdminIdParam error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Validation failed" });
  }
}



