require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });
    const sql = `DELETE FROM reservations WHERE reservation_complete=0 AND created_at < (NOW() - INTERVAL 5 MINUTE) AND is_deleted=0;`;
    const results = await conn.query(sql);
    conn.end();

    return { 
      body: {
        success: 'good to go',
      }, 
      statusCode: 200
    };
  } catch (err) {
    console.error(err);
  }
}
exports.run = main;
main();
