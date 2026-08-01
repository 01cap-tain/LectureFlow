import "dotenv/config";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoute from "./Routes/authRoute.js";
import pool from "./Database/db.js";
import adminRoutes from "./Routes/admin.routes.js";
import profileRoutes from "./Routes/profile.routes.js";

const app = express();
const PORT = process.env.PORT || 8181;

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    name: "lectureflow.sid",
    secret: process.env.SESSION_SECRET || "dev-only-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);

// Lightweight health check (must not touch the database)
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRoute);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);

// Keep pool import so schema bootstrap in Database/db.js runs on boot
void pool;

app.listen(PORT, () => {
  console.log("Server active on", PORT);
});
