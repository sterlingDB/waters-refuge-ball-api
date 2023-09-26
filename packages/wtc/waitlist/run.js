


require('dotenv').config();
const mysql = require('mysql2/promise');
//console.log(process.env.DB_HOST); // remove this after you've confirmed it is working
const format = require('date-fns/format');
const { v4: uuidv4 } = require('uuid');

async function main(args) {
  try {
    if (!args.date){
      return {
        body: {
          error: 'date required',
        },
        statusCode: 400
      };
    }

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: 'walkthroughchristmas',
    });

    const uuid = uuidv4();

    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      args.date,
      (+args.seats.adult) + (+args.seats.child),
      args.seats.adult,
      args.seats.child,
      uuid
    ];

    const sql = `INSERT INTO waitlists
      (name, phone, email, date_slot, seats, adult_seats, child_seats, uuid) 
    VALUES (?,?,?,?,?,?,?,?);`;
    const results = await conn.query(sql, updateArgs);
    conn.end();

    let returnData;
    if (results[0].affectedRows > 0) {
      returnData = { 
        body: {
          success: 'good to go',
        },
        statusCode: 200
       }

    } else {

      returnData = { 
        body: {
          success: 'no clue',
        },
        statusCode: 400
       }

    }

    return returnData;
  } catch (err) {
    console.error(err);
    return err;
  }
}
exports.run = main;
main({
  //date: '2022-12-02',
  name: 'John Morris',
  phone: '320-223-2089',
  email: 'jmorris@sterlingdb.com',
  seats:{adult:1,child:1}
});
