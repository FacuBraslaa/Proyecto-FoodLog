// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./dbconfig.js"; // conexión a la DB

import usersRouter from "./routes/users.js";
import foodsRouter from "./routes/foods.js";
import mealsRouter from "./routes/meals.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Endpoint simple para probar que la API responde
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api", (_req, res) => {
  res.send("FoodLog API funcionando 🚀");
});
// Rutas principales bajo /api
app.use("/api/users", usersRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/meals", mealsRouter);

// Manejo simple de errores
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno" });
});

const port = Number(process.env.PORT) || 3000;

// En local levantamos un servidor Express tradicional
if (!process.env.VERCEL) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`API escuchando en http://0.0.0.0:${port}`);
  });
}

async function bootstrap() {
  try {
    // Ping para validar conexión a la DB al cold start de la función
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("No se pudo iniciar la app:", err);
    throw err;
  }
}

bootstrap();

// Handler para Vercel serverless (no usar app.listen)
export default (req, res) => app(req, res);
