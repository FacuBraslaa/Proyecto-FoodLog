// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./dbconfig.js"; // conexión a la DB

import usersRouter from "./routes/users.js";
import foodsRouter from "./routes/foods.js";
import mealsRouter from "./routes/meals.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Endpoint simple para probar que la API responde
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.send("FoodLog API funcionando 🚀");
});
// Rutas principales
app.use("/users", usersRouter);
app.use("/foods", foodsRouter);
app.use("/meals", mealsRouter);

// Manejo simple de errores
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno" });
});

async function bootstrap() {
  try {
    // 👇 En vez de initDb(), hacemos un ping a la DB para asegurar que conecta
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`API FoodLog lista en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo iniciar la app:", err);
    process.exit(1);
  }
}

bootstrap();
