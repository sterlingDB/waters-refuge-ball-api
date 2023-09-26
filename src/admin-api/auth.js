require('dotenv').config({ path: `${__dirname}/../.env` });

const mysql = require('mysql2/promise');
const { mysqlServer } = require('../connection');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const conn = await mysql.createConnection(mysqlServer);
  const sql = `SELECT * 
  FROM users 
  WHERE username=?;`;
  const [results] = await conn.query(sql, [username]);
  conn.end();

  if (results.length === 0) {
    return res
      .status(401)
      .json({ message: 'The username and password your provided are invalid' });
  }

  const encryptedSuppliedPassword = crypto
    .createHmac('SHA1', process.env.HMAC_USERS)
    .update(password)
    .digest('base64');

  if (
    username === results[0].username &&
    encryptedSuppliedPassword === results[0].password
  ) {
    return res.json({
      fullName: results[0].fullName,
      token: jwt.sign(
        {
          user: results[0].username,
          auth: results[0].auth,
          id: results[0].id,
          fullName: results[0].fullName,
          email: results[0].email,
        },
        process.env.HMAC_JWT
      ),
    });
  }
  return res
    .status(401)
    .json({ message: 'The username and password your provided are invalid' });
});

module.exports = router;
