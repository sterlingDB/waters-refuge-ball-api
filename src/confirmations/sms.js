const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const path = require('path');
const { mysqlServer } = require('../connection');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

async function sms(date) {
  if (!date) {
    return { error: 'date is required' };
  }

  const conn = await mysql.createConnection(mysqlServer);

  try {
    const sqlReservation = `SELECT * FROM reservations WHERE date_slot = ? 
    AND confirmation_text_sent=0 
    AND is_deleted=0;`;
    const [resultsReservation] = await conn.query(sqlReservation, [date]);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    for (const x of resultsReservation) {
      const resDateTime = new Date(
        format(x.date_slot, 'yyyy-MM-dd') + 'T' + x.time_slot
      );

      const body = `Reminder!

Walk Through Christmas is tonight!

We have your ${x.reserved_seats} spots reserved for ${format(
        resDateTime,
        'eeee MMMM do hh:mm aaa'
      )} under ${x.name}.

Can't wait to see you here!`;

      const foo = await client.messages
        .create({
          body: body,
          from: '+13203453479',
          to: x.phone,
          //to: '3202232089',
        })
        .then(async (message) => {
          console.log('text sent');

          const sqlUpdate = `UPDATE reservations SET confirmation_text_sent=1 WHERE uuid=?;`;
          const [resultsUpdate] = await conn.query(sqlUpdate, [x.uuid]);

          return message;
        });

      //return { success: foo.sid };
    }

    return { success: 'good to go' };
  } catch (err) {
    console.error(err);
    return { error: err };
  } finally {
    conn.end();
  }
}

sms('2022-12-04');
