import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { pool } from "./db.js";

const app = express();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// ROLE ID GETTER
async function getRoleId(roleName) {
  const [rows] = await pool.query(
    "SELECT role_id FROM user_roles WHERE role_name = ?",
    [roleName]
  );
  return rows[0]?.role_id;
}

// REGISTER ENDPOINT
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      email,
      password,
      role_type,
      full_name,
      username,
      age_group,
      parent_email,
      organization,
    } = req.body;

    const [exists] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (exists.length > 0)
      return res.status(400).json({ message: "Email already registered." });

    const roleId = await getRoleId(role_type);

    const hash = await bcrypt.hash(password, 10);

    const [userInsert] = await pool.query(
      `INSERT INTO users (email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, 1)`,
      [email, hash, roleId]
    );

    const userId = userInsert.insertId;

    // Role-specific inserts
    if (role_type === "builder") {
      await pool.query(
        `INSERT INTO builder_profiles (full_name, username, age_range, user_id)
         VALUES (?, ?, ?, ?)`,
        [full_name, username, age_group, userId]
      );
    }

    if (role_type === "parent") {
      await pool.query(
        `INSERT INTO parent_profiles (full_name, user_id)
         VALUES (?, ?)`,
        [full_name, userId]
      );
    }

    if (role_type === "child") {
      await pool.query(
        `INSERT INTO mini_profiles (mini_name, age_range, email, parent_email, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [full_name, age_group, email, parent_email, userId]
      );
    }

    if (role_type === "expert") {
      await pool.query(
        `INSERT INTO expert_profiles (full_name, username, organization, user_id)
         VALUES (?, ?, ?, ?)`,
        [full_name, username, organization, userId]
      );
    }

    return res.json({ message: "Registration successful." });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

const PORT = 4000;
app.listen(PORT, () =>
  console.log("API is running at http://localhost:" + PORT)
);
