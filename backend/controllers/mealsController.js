import pool from "../dbconfig.js";

export async function createMeal(req, res, next) {
  try {
    const {
      user_id,
      meal_type,
      eaten_at,
      food_id,
      food_name,
      quantity,
      unit_label = "porción",
      calories_per_unit,
    } = req.body || {};

    const mealTypeMap = {
      breakfast: "desayuno",
      lunch: "almuerzo",
      dinner: "cena",
      snack: "merienda",
      desayuno: "desayuno",
      almuerzo: "almuerzo",
      comida: "almuerzo",
      cena: "cena",
      merienda: "merienda",
    };

    const rawMealType = meal_type?.toString().trim().toLowerCase();
    const normalizedMealType = mealTypeMap[rawMealType];

    const allowedMealTypes = new Set(["desayuno", "almuerzo", "merienda", "cena"]);

    if (!normalizedMealType || !allowedMealTypes.has(normalizedMealType)) {
      return res.status(400).json({
        error: `meal_type inválido: "${meal_type}". Usa: desayuno, almuerzo, merienda o cena`,
      });
    }

    if (
      !user_id ||
      !normalizedMealType ||
      !food_name ||
      !quantity ||
      !calories_per_unit
    ) {
      return res.status(400).json({
        error:
          "user_id, meal_type, food_name, quantity y calories_per_unit son obligatorios",
      });
    }

    const params = [
      user_id,
      normalizedMealType,
      eaten_at ?? null,
      food_id ?? null,
      food_name.trim(),
      Number(quantity),
      unit_label.trim(),
      Number(calories_per_unit),
    ];

    const { rows } = await pool.query(
      `
        INSERT INTO meal_entries (
          user_id, meal_type, eaten_at, food_id,
          food_name, quantity, unit_label, calories_per_unit
        )
        VALUES ($1, $2, COALESCE($3, NOW()), $4, $5, $6, $7, $8)
        RETURNING *
      `,
      params,
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

export async function listMeals(req, res, next) {
  try {
    const { user_id, day } = req.query;
    const where = [];
    const params = [];

    if (user_id) {
      params.push(user_id);
      where.push(`user_id = $${params.length}`);
    }
    if (day) {
      params.push(day);
      where.push(`DATE(eaten_at) = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `
        SELECT * FROM meal_entries
        ${whereClause}
        ORDER BY eaten_at DESC
      `,
      params,
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function getMealById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM meal_entries WHERE id = $1", [
      id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado" });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

export async function dailyTotals(req, res, next) {
  try {
    const { user_id, day } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: "user_id es obligatorio" });
    }

    const params = [user_id];
    let query = `
      SELECT user_id, day, total_kcal
      FROM daily_calorie_totals
      WHERE user_id = $1
    `;

    if (day) {
      params.push(day);
      query += ` AND day = $2`;
    }

    query += " ORDER BY day DESC";

    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function updateMeal(req, res, next) {
  try {
    const { id } = req.params;
    const {
      user_id,
      meal_type,
      eaten_at,
      food_id,
      food_name,
      quantity,
      unit_label = "porción",
      calories_per_unit,
    } = req.body || {};

    const mealTypeMap = {
      breakfast: "desayuno",
      lunch: "almuerzo",
      dinner: "cena",
      snack: "merienda",
      desayuno: "desayuno",
      almuerzo: "almuerzo",
      comida: "almuerzo",
      cena: "cena",
      merienda: "merienda",
    };

    const rawMealType = meal_type?.toString().trim().toLowerCase();
    const normalizedMealType = mealTypeMap[rawMealType];
    const allowedMealTypes = new Set(["desayuno", "almuerzo", "merienda", "cena"]);

    if (!normalizedMealType || !allowedMealTypes.has(normalizedMealType)) {
      return res.status(400).json({
        error: `meal_type inválido: "${meal_type}". Usa: desayuno, almuerzo, merienda o cena`,
      });
    }

    if (!user_id || !food_name || !quantity || !calories_per_unit) {
      return res.status(400).json({
        error: "user_id, meal_type, food_name, quantity y calories_per_unit son obligatorios",
      });
    }

    const params = [
      user_id,
      normalizedMealType,
      eaten_at ?? null,
      food_id ?? null,
      food_name.trim(),
      Number(quantity),
      unit_label.trim(),
      Number(calories_per_unit),
      id,
    ];

    const { rows } = await pool.query(
      `
        UPDATE meal_entries
        SET user_id = $1,
            meal_type = $2,
            eaten_at = COALESCE($3, eaten_at),
            food_id = $4,
            food_name = $5,
            quantity = $6,
            unit_label = $7,
            calories_per_unit = $8
        WHERE id = $9
        RETURNING *
      `,
      params,
    );

    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado" });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

export async function deleteMeal(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `
        DELETE FROM meal_entries
        WHERE id = $1
        RETURNING *
      `,
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: "Registro no encontrado" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}
