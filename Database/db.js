import pkg from "pg";
const { Pool } = pkg;
import fs from "fs/promises";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("Database pool error:", err.message);
});

export default pool;
