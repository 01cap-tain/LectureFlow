import fs from "fs/promises";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 12, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Neon connection went idle");
});

const sql = await fs.readFile("./Database/schema.sql", "utf8");
await pool.query(sql);
export default pool;
