import pool from "../dbconfig.js";

// Crea un alimento en el catálogo
export async function createFood(req, res, next) {
  try {
    const { name, unit_label = "porción", calories_per_unit, created_by_user_id } =
      req.body || {};

    if (!name || !calories_per_unit) {
      return res
        .status(400)
        .json({ error: "name y calories_per_unit son obligatorios" });
    }

    const params = [
      name.trim(),
      unit_label.trim(),
      Number(calories_per_unit),
      created_by_user_id ?? null,
    ];

    const { rows } = await pool.query(
      `
        INSERT INTO foods (name, unit_label, calories_per_unit, created_by_user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      params,
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
}

// Lista alimentos, con filtro opcional por nombre 
export async function listFoods(req, res, next) {
  try {
    const { q } = req.query;
    let query = "SELECT * FROM foods";
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      query += ` WHERE LOWER(name) LIKE LOWER($${params.length})`;
    }

    query += " ORDER BY created_at DESC";
    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

// Obtiene un alimento por id
export async function getFoodById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM foods WHERE id = $1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Alimento no encontrado" });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}
