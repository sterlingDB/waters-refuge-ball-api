require('dotenv').config();
const mysql = require('mysql2/promise');
const format = require('date-fns/format');

async function main(args) {

  if(!args.uuid){
    return { body: {error:'uuid is required'}, statusCode: 400};
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'walkthroughchristmas',
  });

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const uuid = args.uuid;
    const sqlReservation = `SELECT * FROM reservations WHERE uuid=?;`;
    const [[resultsReservation]] = await conn.query(sqlReservation, [uuid]);

    const resDateTime = new Date(format(resultsReservation.date_slot,'yyyy-MM-dd')+'T'+resultsReservation.time_slot)

    const body = `Walk Through Christmas Reservations!
We have your ${resultsReservation.reserved_seats} spots reserved for ${format(resDateTime, 'eeee MMMM do hh:mm aaa')}.
Can't wait to see you here!`

   const foo =  await client.messages
      .create({
        body: body,
        from: '+13203453479',
        to: resultsReservation.phone,
      })
      .then(async (message) => {

        const sqlUpdate = `UPDATE reservations SET reservation_text_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [uuid]);

        return message
      });

    return { body: foo.sid, statusCode: 200};
  } catch (err) {
    console.error(err);
    // return { error: err };
    return { body: err, statusCode: 400};
  }finally{
    conn.end();
  }
}
exports.run = main;
main({ uuid: 'a59a016b-f1ea-444f-885b-7482008f7c26' });
