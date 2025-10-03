const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Firebase admin initialization
const serviceAccount = require('./firebase-service.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Create table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
  )
`);

// Signup/Login with Firebase token
app.post('/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decodedToken;

    // Check if user exists
    const user = await pool.query('SELECT * FROM users WHERE uid = $1', [uid]);

    if (user.rows.length === 0) {
      // Insert new user
      await pool.query(
        'INSERT INTO users (uid, name, email) VALUES ($1, $2, $3)',
        [uid, name || '', email]
      );
    }

    res.json({ success: true, uid, email, name });
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
