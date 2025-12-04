import crypto from "crypto";
import pool from "../dbconfig.js";

const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

const hashPassword = (plain) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(
      plain,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(
          `pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString(
            "hex",
          )}`,
        );
      },
    );
  });

export async function createUser(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "username, email y password son obligatorios" });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, created_at
      `,
      [username.trim(), email.trim().toLowerCase(), passwordHash],
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    // Unique constraint errors
    if (err.code === "23505") {
      return res.status(409).json({ error: "username o email ya registrado" });
    }
    return next(err);
  }
}

export async function listUsers(_req, res, next) {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, email, created_at FROM users ORDER BY created_at DESC",
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT id, username, email, created_at FROM users WHERE id = $1",
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
}
