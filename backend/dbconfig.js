import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Configuración de la base de datos
// Usa primero las variables de entorno y, si no existen,
// toma como default la conexión de Neon.
const dbConfig = {
  user: process.env.PGUSER || "neondb_owner",
  host:
    process.env.PGHOST ||
    "ep-flat-glitter-a4sa2av1-pooler.us-east-1.aws.neon.tech",
  database: process.env.PGDATABASE || "neondb",
  password: process.env.PGPASSWORD || "npg_WAPcN2pewD9J",
  port: Number(process.env.PGPORT) || 5432,
  ssl: { rejectUnauthorized: false },
};

console.log("[DB] Conectando a PostgreSQL", {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
});

const pool = new Pool(dbConfig);

export default pool;