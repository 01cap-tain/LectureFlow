import "dotenv/config";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoute from "./Routes/authRoute.js";
import pool from "./Database/db.js";
import adminRoutes from "./Routes/admin.routes.js";
import profileRoutes from "./Routes/profile.routes.js";
import lectureRoutes from "./Routes/lecture.routes.js";
import studentRoutes from "./Routes/student.routes.js";
import { RedisStore } from "connect-redis";
import { getValkeyClient } from "./Services/valkey.js";

const app = express();
const PORT = process.env.PORT || 8181;
const sessionClient = await getValkeyClient();
const isProduction = process.env.NODE_ENV === "production";

// Render sits in front of the app as a proxy. This lets secure cookies work in production.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionConfig = {
  name: "lectureflow.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

if (sessionClient?.isReady) {
  sessionConfig.store = new RedisStore({ client: sessionClient });
} else {
  // Local fallback only: server can boot when Valkey is unavailable.
  console.warn("Valkey session store unavailable. Using in-memory sessions.");
}

const sessionMiddleware = session(sessionConfig);

app.use((req, res, next) => {
  sessionMiddleware(req, res, (err) => {
    if (!err) return next();

    console.error("Session store error:", err.message);
    return res.status(503).json({
      success: false,
      message: "Session service temporarily unavailable",
    });
  });
});

// Lightweight health check (must not touch the database)
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRoute);
app.use("/admin", adminRoutes);
app.use("/profile", profileRoutes);
app.use("/student", studentRoutes);

app.use("/lectures", lectureRoutes);

// Keep pool import so schema bootstrap in Database/db.js runs on boot
void pool;

app.listen(PORT, () => {
  console.log("Server active on", PORT);
});
