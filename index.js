const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const port = 4000;

// Secret key for JWT
const jwtSecret = "1601200716122006"; // Gantilah dengan kunci rahasia yang lebih aman

app.use(express.json());
app.use(cors()); // Enable CORS

// Konfigurasi koneksi MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_counter",
});

// Koneksi ke MySQL
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("MySQL Connected...");
});

app.get("/", (req, res) => {
  res.send({
    message: "API for Counter App Denapella",
    author: "https://github.com/fphaikal",
  });
});

// Endpoint untuk mendapatkan data
app.get("/api/data", (req, res) => {
  const sql = `SELECT * FROM data`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ code: 200, results });
  });
});

app.get("/api/sensor", (req, res) => {
  const id = req.query.id;

  if (id > 4) {
    return res.status(400).json({ error: "Invalid sensor ID" });
  }

  const sql = `SELECT * FROM sensor_${id}`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ code: 200, results });
  });
});

// Endpoint untuk menerima data dari ESP32
app.post("/api/data", (req, res) => {
  const id = req.query.sensorId;
  const value = parseInt(req.query.value);

  if (isNaN(value)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const sql = `INSERT INTO sensor_${id} (value) VALUES (?)`;
  db.query(sql, [value], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Update lastValue di tabel data
    const updateLastValueSql = `
      UPDATE data
      SET lastValue = (
        SELECT value FROM sensor_${id} ORDER BY timestamp DESC LIMIT 1
      )
      WHERE sensorId = ${id};
    `;
    db.query(updateLastValueSql, (updateErr) => {
      if (updateErr) {
        console.error("Failed to update lastValue:", updateErr.message);
      }
    });

    res.status(200).json({
      code: 200,
      message: "Data inserted successfully",
      id: results.insertId,
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}\nhttp://localhost:${port}`);
});
