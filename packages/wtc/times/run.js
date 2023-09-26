require('dotenv').config();
const mysql = require('mysql2/promise');
const format = require('date-fns/format');

async function main(args) {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });
    const sql = `SELECT timeslots.*,
    timeslots.available_seats AS totalSeats,
    IFNULL(SUM(reservations.reserved_seats),0) AS reservedSeats, 
    (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
    FROM timeslots 
    LEFT JOIN reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
    WHERE timeslots.date_slot=?
    AND timeslots.showAfter <= DATE_SUB(NOW(), INTERVAL 5 HOUR) 
    GROUP BY timeslots.id
    ORDER BY timeslots.date_slot, timeslots.time_slot;`;


    const results = await conn.query(sql, args.date);
    conn.end();

    const returnData = results[0].map((x) => {
      return {
        id: x.id,
        time: x.time_slot,
        seats:{
          available: +x.availableSeats,
          reserverd: +x.reservedSeats,
          total: +x.totalSeats,
         },
        showAfter: format(x.showAfter, 'yyyy-MM-dd HH:mm:ss'),
      };
    });

    return { 
      body: returnData,
      statusCode: 200
    };
  } catch (err) {
    console.error(err);
  }
}
exports.run = main;
main({ date: '2022-12-01' });
