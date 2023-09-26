require('dotenv').config();
const mysql = require('mysql2/promise');
//console.log(process.env.DB_HOST); // remove this after you've confirmed it is working
const format = require('date-fns/format');
const { v4: uuidv4 } = require('uuid');

async function main(args) {
  try {
    if (args.seats <= 0)
      return {
        body: {
          error: 'not enough spots',
        },
        statusCode: 400
      };

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });
    const uuid = uuidv4();

    const sqlTimeSlot = `SELECT * FROM timeslots WHERE id=?;`;
    const resultsTimeSlot = await conn.query(sqlTimeSlot, [args.slotId]);
    const insertArgs = [
      uuid,
      args.slotId,
      format(resultsTimeSlot[0][0].date_slot, 'yyyy-MM-dd'),
      resultsTimeSlot[0][0].time_slot,
      args.seats,
      args.slotId,
      args.seats,
    ];

    const sql = `INSERT INTO reservations (uuid, slot_id, date_slot, time_slot, reserved_seats) 
    SELECT ?, ?, ?, ?, ? FROM 
    (SELECT (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
        FROM timeslots 
        LEFT JOIN reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
        WHERE timeslots.id=?
        GROUP BY timeslots.id) AS available 
        WHERE available.availableSeats >= ?;`;
    const results = await conn.query(sql, insertArgs);
    conn.end();

    let returnData;
    if (results[0].insertId > 0) {
      returnData = { 
        body: {
          uuid,
        },
        statusCode: 200
       };
    } else {
      returnData = { 
        body: {
          error: 'not enough seats',
        },
        statusCode: 400
       };
    }

    return returnData;
  } catch (err) {
    console.error(err);
    return err;
  }
}
exports.run = main;
main({
  slotId: 129,
  seats: 5,
});
