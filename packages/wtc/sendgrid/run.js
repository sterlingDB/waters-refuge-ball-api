require('dotenv').config();
const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const sgMail = require('@sendgrid/mail')

async function main(args) {

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'walkthroughchristmas',
  });

  try {

    if (!args.uuid){
      return {
        body: {
          error: 'reservation not found',
        },
        statusCode: 400
      };
    }

    const uuid = args.uuid;
    const sqlReservation = `SELECT * FROM reservations WHERE uuid=?;`;
    const [[resultsReservation]] = await conn.query(sqlReservation, [uuid]);

    const resDateTime = new Date(format(resultsReservation.date_slot,'yyyy-MM-dd')+'T'+resultsReservation.time_slot)


    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
      to: resultsReservation.email, 
      from: 'wtc@thewaterschurch.net',
      subject: 'Walk Through Christmas Confirmation',
      templateId: 'd-1dff75d26e804fa79260d7a1c17cade3',
      dynamicTemplateData: {
        name:resultsReservation.name,
        seats:resultsReservation.reserved_seats, 
        date:format(resDateTime, 'eeee MMMM do'),
        time:format(resDateTime, 'hh:mm aaa'),
      },
    }
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent')

        const sqlUpdate = `UPDATE reservations SET reservation_email_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [uuid]);

      })
      .catch((error) => {
        console.error(error)
        return {
          body: {
            error: error,
          },
          statusCode: 400
        };
      })
      return {
        body: {
          success: "good to go",
        },
        statusCode: 200
      };

  } catch (err) {
    console.error(err);
    return { error: err };

  } finally {
    conn.end();
  }
}
exports.run = main;
main({ uuid: 'a59a016b-f1ea-444f-885b-7482008f7c26' });
