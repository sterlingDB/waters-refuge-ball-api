require('dotenv').config();
const mysql = require('mysql2/promise');
//console.log(process.env.DB_HOST); // remove this after you've confirmed it is working
const format = require('date-fns/format');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

async function main(args) {
  try {
    if (!args.uuid){
      return {
        body: {
          error: 'reservation not found',
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

    const sqlResValid = `SELECT * FROM reservations WHERE uuid=?;`;
    const resultsResValid = await conn.query(sqlResValid, [args.uuid]);
    if(resultsResValid[0].length === 0){
      conn.end();
      return {
        body: {
          error: 'reservation not found',
        },
        statusCode: 400
      };
    }
    if(resultsResValid[0][0].reserved_seats != ((+args.seats.adult) + (+args.seats.child))){
      conn.end();
      return {
        body: {
          error: 'adult and child seats do not = reservation',
        },
        statusCode: 400
      }
    }
    if(resultsResValid[0][0].is_deleted === 1){
      conn.end();
      return {
        body: {
          error: 'hold time has expired',
        },
        statusCode: 400
      };
    }
    if(resultsResValid[0][0].reservation_complete === 1){
      conn.end();
      return {
        body: {
          error: 'reservation already completed, no more changes',
        },
        statusCode: 400
      };
    }
    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      args.cast,
      args.seats.adult,
      args.seats.child,
      args.uuid
    ];

    const sql = `UPDATE reservations 
    SET name=?, phone=?, email=?, cast_member_name=?, adult_seats=?, child_seats=?, reservation_complete=1
    WHERE uuid = ?
    AND is_deleted=0
    AND reservation_complete=0;`;
    const results = await conn.query(sql, updateArgs);
    conn.end();

    let returnData;
    let emailResults;
    let smsResults;

    if (results[0].affectedRows > 0) {
      returnData = {
        body: {
          success: 'good to go',
        },
        statusCode: 200
      }


 
       axios.get('https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-abdb044a-388f-4e27-89e8-849a449d10f6/wtc/sendgrid', {
        params: {
          uuid: args.uuid
        }
      })
      .then(function (response) {
        console.log(response);
        emailResults = response;
      })
      .catch(function (error) {
        console.log(error);
        emailResults = error;
      });

       axios.get('https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-abdb044a-388f-4e27-89e8-849a449d10f6/wtc/sms', {
        params: {
          uuid: args.uuid
        }
      })
      .then(function (response) {
        console.log(response);
        smsResults = response;
      })
      .catch(function (error) {
        console.log(error);
        smsResults = error;
      });

    } else {
      returnData = {
        body: {
          error: 'no clue',
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
  uuid: '60d23cef-d693-4bea-aad4-6ad309caf26a',
  name: 'John Morris',
  phone: '320-223-2089',
  email: 'jmorris@sterlingdb.com',
  cast: 'Grinch #2',
  seats:{adult:1,child:2}
});
