require('dotenv').config();
const mysql = require('mysql2/promise');
// console.log(process.env.DB_HOST); // remove this after you've confirmed it is working
const format = require('date-fns/format');

async function main() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });
    const sql = `SELECT DISTINCT (date_slot) 
    FROM timeslots 
    WHERE timeslots.showAfter <= DATE_SUB(NOW(), INTERVAL 5 HOUR) 
    AND date_slot > NOW() 
    ORDER BY date_slot asc;`;
    const results = await conn.query(sql);
    conn.end();

    const returnData = results[0].map((x) => 
      format(x.date_slot, 'yyyy-MM-dd'),
       
    );

    return { body: returnData, statusCode: 200 };
  } catch (err) {
    console.error(err);
  }
}
exports.run = main;
main();
