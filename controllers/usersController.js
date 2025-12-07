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

const verifyPassword = (plain, stored) =>
  new Promise((resolve, reject) => {
    try {
      const [, digest, iterationsStr, salt, key] = stored.split("$");
      const iterations = Number(iterationsStr);
      crypto.pbkdf2(
        plain,
        salt,
        iterations,
        PBKDF2_KEYLEN,
        digest,
        (err, derivedKey) => {
          if (err) return reject(err);
          const expected = key;
          const received = derivedKey.toString("hex");
          resolve(crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex")));
        },
      );
    } catch (err) {
      reject(err);
    }
  });

export async function createUser(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    const cleanUsername = username?.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.toString();

    if (!cleanUsername || !cleanEmail || !cleanPassword) {
      return res
        .status(400)
        .json({ error: "username, email y password son obligatorios" });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres" });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const check = await pool.query(
      `
        SELECT 1
        FROM users
        WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)
        LIMIT 1
      `,
      [cleanUsername, cleanEmail],
    );

    if (check.rows.length) {
      return res.status(409).json({ error: "username o email ya registrado" });
    }

    const passwordHash = await hashPassword(cleanPassword);
    const { rows } = await pool.query(
      `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email, created_at
      `,
      [cleanUsername, cleanEmail, passwordHash],
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

export async function loginUser(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "username y password son obligatorios" });
    }

    const { rows } = await pool.query(
      `
        SELECT id, username, email, password_hash, created_at
        FROM users
        WHERE LOWER(username) = LOWER($1)
      `,
      [username.trim()],
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: "La cuenta no tiene contraseña, vuelve a registrarte" });
    }

    let ok = false;
    try {
      ok = await verifyPassword(password, user.password_hash);
    } catch (err) {
      console.error("Error verificando contraseña:", err);
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    if (!ok) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // No devolvemos el hash
    const { password_hash, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
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
