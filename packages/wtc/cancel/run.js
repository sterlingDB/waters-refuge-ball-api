require('dotenv').config();
const mysql = require('mysql2/promise');

async function main(args) {
  try {
    if (!args.uuid)
    return {
      body: {
        error: 'invalid uuid',
      },
    };
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });
    const sql = `DELETE FROM reservations WHERE uuid=? AND reservation_complete=0;`;
    const results = await conn.query(sql, [args.uuid]);
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
main({uuid:'bc02498c-3a83-4461-b19a-40bbd1d0c760'});
