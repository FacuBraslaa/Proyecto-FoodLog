// dbconfig.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user: "neondb_owner",
  host: "ep-bitter-scene-ac82sfp9-pooler.sa-east-1.aws.neon.tech",
  database: "neondb",
  password: "npg_8QZaG0wHclEq",
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

export default pool;