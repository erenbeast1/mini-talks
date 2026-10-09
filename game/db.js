// db.js
import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: "217.154.240.193",   // <- BURAYA IP GELİYOR, :8443 YOK
  port: 3306,                // hosting başka port verdiyse onu yaz
  user: "admin_mini",     // phpMyAdmin kullanıcı adın
  password: process.env.DB_PASSWORD || "SET-IN-YOUR-OWN-ENV", // never committed
  database: "minitalks",     // oluşturduğun veritabanı
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
