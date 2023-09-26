const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const path = require('path');
const { mysqlServer } = require('../connection');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

async function email(date) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!date) {
      return { error: 'reservation not found' };
    }

    const sqlReservation = `SELECT * FROM reservations 
    WHERE date_slot = ? 
    AND confirmation_email_sent=0 
    AND is_deleted=0;`;
    const [resultsReservation] = await conn.query(sqlReservation, [date]);

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    for (const x of resultsReservation) {
      const resDateTime = new Date(
        format(x.date_slot, 'yyyy-MM-dd') + 'T' + x.time_slot
      );
      const msg = {
        to: x.email,
        //to: 'jmorris@sterling-databases.com',
        from: 'wtc@thewaterschurch.net',
        subject: 'Walk Through Christmas Reminder!',
        templateId: 'd-36039bfe26644e5a934914a3c87e4632',
        dynamicTemplateData: {
          name: x.name,
          seats: x.reserved_seats,
          date: format(resDateTime, 'eeee MMMM do'),
          time: format(resDateTime, 'hh:mm aaa'),
        },
      };

      await sgMail
        .send(msg)
        .then(async (foo) => {
          console.log('Email sent');

          const sqlUpdate = `UPDATE reservations SET confirmation_email_sent=1 WHERE uuid=?;`;
          const [resultsUpdate] = await conn.query(sqlUpdate, [x.uuid]);
        })
        .catch((error) => {
          console.error(error);
          return { error };
        });
    }

    return { success: 'good to go' };
  } catch (err) {
    console.error(err);
    return { error: err };
  } finally {
    conn.end();
  }
}

email('2022-12-04');

//module.exports = router;
