const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const port = 4000;

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const client = new Client({
  authStrategy: new LocalAuth({
      dataPath: 'api'
  })
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('qr', qr => {
  qrcode.generate(qr, {small: true});
});

client.initialize();

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

  if(!id){
    return res.status(200).json({ error: "Please Fill Sensor Id"})
  }

  const sql = `SELECT * FROM sensor_${id} ORDER BY timestamp DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ code: res.statusCode,results });

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
        client.sendMessage('6285765909380@c.us', updateErr.message)
      }
    });
    const updateLastTimestampSql = `
      UPDATE data
      SET lastUpdate = (
        SELECT timestamp FROM sensor_${id} ORDER BY timestamp DESC LIMIT 1
      )
      WHERE sensorId = ${id};
    `;
    db.query(updateLastTimestampSql, (updateErr) => {
      if (updateErr) {
        console.error("Failed to update lastUpdate:", updateErr.message);
        client.sendMessage('6285765909380@c.us', updateErr.message)
      }
    });

    if(res.statusCode) {
      console.log(res.statusCode)
      client.sendMessage('6285765909380@c.us', `Data sensor ${id} berhasil dimasukkan`)
    }
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
