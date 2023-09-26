require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  try {
    let status = 'closed';

    const now = new Date();
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });

    const sql = `SELECT * FROM system_status WHERE id=1;`;
    const [[results]] = await conn.query(sql);
    conn.end();

    const openDateTime = new Date(results.openDateTime);
    const closeDateTime = new Date(results.closeDateTime);

    if(results.cast){
      status='castCrew';
    }
    if(results.reg || now >= openDateTime && now <= closeDateTime){
      status='registration';
    }
    if(results.waitlist){
      status='waitlist';
    }
    const returnData = {
      status
    }

    return { 
      body: {status},
      statusCode: 200
    };
  } catch (err) {
    console.error(err);
  }
}
exports.run = main;
main();
