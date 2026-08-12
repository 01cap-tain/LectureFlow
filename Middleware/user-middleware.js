import validator from "validator";

/**
 * Student sign-up only.
 * Expects: email, matric_no, password (all required).
 * Only validates format — department resolution happens in the controller.
 */
export function validateSignUp(req, res, next) {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const matric_no =
      typeof req.body?.matric_no === "string" ? req.body.matric_no.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    const errors = [];

    // ---- email ----
    if (!email) {
      errors.push("Email is required");
    } else if (!validator.isEmail(email)) {
      errors.push("Invalid email address");
    } else if (!validator.isLength(email, { max: 255 })) {
      errors.push("Email must be at most 255 characters");
    }

    // ---- matric_no ----
    if (!matric_no) {
      errors.push("Matric number is required");
    } else if (!validator.isLength(matric_no, { min: 3, max: 50 })) {
      errors.push("Matric number must be between 3 and 50 characters");
    }
    // ---- Matric Year Validation (reject future years only) ----
    const yearMatch = matric_no.match(/(\d{2})/); // gets the first two digits
    if (yearMatch) {
      const matricYear = 2000 + parseInt(yearMatch[1], 10); // e.g. 22 → 2022
      const currentYear = new Date().getFullYear();

      if (matricYear > currentYear) {
        errors.push(
          `Matric year ${matricYear} cannot be in the future (current year is ${currentYear})`,
        );
      }
    }

    // ---- password ----
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
      } else if (!validator.isLength(password, { max: 128 })) {
        errors.push("Password must be at most 128 characters");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Normalize values
    req.body.email = validator.normalizeEmail(email) || email.toLowerCase();
    req.body.matric_no = matric_no.toUpperCase();
    req.body.password = password;

    return next();
  } catch (err) {
    console.error("validateSignUp error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}

/**
 * Sign-in for all roles.
 *
 * Students         → { matric_no, password }
 * Admin / Lecturer → { email, password }
 */
export function validateSignIn(req, res, next) {
  try {
    const emailRaw =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const matricRaw =
      typeof req.body?.matric_no === "string" ? req.body.matric_no.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    const hasEmail = emailRaw.length > 0;
    const hasMatric = matricRaw.length > 0;
    const errors = [];

    if (!password) {
      errors.push("Password is required");
    }

    if (hasMatric && !hasEmail) {
      if (!validator.isLength(matricRaw, { min: 3, max: 50 })) {
        errors.push("Matric number must be between 3 and 50 characters");
      }
    } else if (hasEmail && !hasMatric) {
      if (!validator.isEmail(emailRaw)) {
        errors.push("Invalid email address");
      }
    } else if (hasEmail && hasMatric) {
      errors.push(
        "Use either matric number (student) or email (staff), not both",
      );
    } else {
      errors.push(
        "Provide matric number for student sign-in, or email for staff sign-in",
      );
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.password = password;

    if (hasMatric) {
      req.body.login_as = "student";
      req.body.matric_no = matricRaw.toUpperCase();
      delete req.body.email;
    } else {
      req.body.login_as = "staff";
      req.body.email =
        validator.normalizeEmail(emailRaw) || emailRaw.toLowerCase();
      delete req.body.matric_no;
    }

    return next();
  } catch (err) {
    console.error("validateSignIn error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}

/**
 * Require an authenticated session.
 */
export function requireAuth(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  return next();
}

/**
 * Role-based route guard.
 * Example: requireRole("admin"), requireRole("admin", "moderator")
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }
    return next();
  };
}
/**
 * Public forgot-password validation. User cannot be logged in yet.
 */
export function validateForgotPassword(req, res, next) {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const errors = [];

    if (!email) {
      errors.push("Email is required");
    } else if (!validator.isEmail(email)) {
      errors.push("Invalid email address");
    } else if (!validator.isLength(email, { max: 255 })) {
      errors.push("Email must be at most 255 characters");
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    req.body.email = validator.normalizeEmail(email) || email.toLowerCase();
    return next();
  } catch (err) {
    console.error("validateForgotPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Validation failed",
    });
  }
}

