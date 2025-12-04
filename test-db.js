import pool from "./dbconfig.js";

async function test() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Conectado! Hora del servidor:", res.rows[0].now);
    process.exit(0);
  } catch (err) {
    console.error("Error de conexión:", err);
    process.exit(1);
  }
}

test();