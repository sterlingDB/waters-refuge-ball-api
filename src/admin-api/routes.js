const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const parseISO = require('date-fns/parseISO');
const path = require('path');
const { mysqlServer } = require('../connection');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

async function sms(args) {
  if (!args.uuid) {
    return { error: 'uuid is required' };
  }
  const conn = await mysql.createConnection(mysqlServer);

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const uuid = args.uuid;
    const sqlReservation = `SELECT * FROM reservations WHERE uuid=?;`;
    const [[resultsReservation]] = await conn.query(sqlReservation, [uuid]);

    const resDateTime = new Date(
      format(resultsReservation.date_slot, 'yyyy-MM-dd') +
        'T' +
        resultsReservation.time_slot
    );

    const body = `Walk Through Christmas Reservations!
We have your ${resultsReservation.reserved_seats} spots reserved for ${format(
      resDateTime,
      'eeee MMMM do hh:mm aaa'
    )}.
Can't wait to see you here!`;

    const foo = await client.messages
      .create({
        body: body,
        from: '+13203453479',
        to: resultsReservation.phone,
      })
      .then(async (message) => {
        console.log('text sent');

        const sqlUpdate = `UPDATE reservations SET reservation_text_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [uuid]);

        return message;
      });

    return { success: foo.sid };
  } catch (err) {
    console.error(err);
    return { error: err };
  } finally {
    conn.end();
  }
}
async function email(args) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!args.uuid) {
      return { error: 'reservation not found' };
    }

    const uuid = args.uuid;
    const sqlReservation = `SELECT * FROM reservations WHERE uuid=?;`;
    const [[resultsReservation]] = await conn.query(sqlReservation, [uuid]);

    const resDateTime = new Date(
      format(resultsReservation.date_slot, 'yyyy-MM-dd') +
        'T' +
        resultsReservation.time_slot
    );

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: resultsReservation.email,
      from: 'wtc@thewaterschurch.net',
      subject: 'Walk Through Christmas Confirmation',
      templateId: 'd-1dff75d26e804fa79260d7a1c17cade3',
      dynamicTemplateData: {
        name: resultsReservation.name,
        seats: resultsReservation.reserved_seats,
        date: format(resDateTime, 'eeee MMMM do'),
        time: format(resDateTime, 'hh:mm aaa'),
      },
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent');

        const sqlUpdate = `UPDATE reservations SET reservation_email_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [uuid]);
      })
      .catch((error) => {
        console.error(error);
        return { error };
      });

    return { success: 'good to go' };
  } catch (err) {
    console.error(err);
    return { error: err };
  } finally {
    conn.end();
  }
}

router.get('/dates', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT DISTINCT (date_slot) 
    FROM timeslots 
    ORDER BY date_slot asc;`;
    const [results] = await conn.query(sql);
    conn.end();

    const returnData = results.map((x) => {
      return {
        button: format(x.date_slot, 'eeee (MM/dd)'),
        search: format(x.date_slot, 'MM/dd'),
      };
    });

    return res.status(200).json(returnData);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/reservations', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT * FROM reservations WHERE is_deleted=0 AND reservation_complete=1;`;
    const [results] = await conn.query(sql);
    conn.end();

    results.map((x) => {
      const resDateTime = new Date(
        format(x.date_slot, 'yyyy-MM-dd') + 'T' + x.time_slot
      );
      x.formattedDate = format(resDateTime, 'MM/dd @ hh:mm aaa');
    });

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/reservations', async (req, res) => {
  try {
    const args = req.body;

    const updateArgs = [
      args.name,
      args.email,
      args.reserved_seats,
      args.adult_seats,
      args.child_seats,
      args.uuid,
    ];

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `UPDATE reservations
      SET name=?, email=?, reserved_seats=?, adult_seats=?, child_seats=?
      WHERE uuid = ?;`;
    const [results] = await conn.query(sql, updateArgs);
    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.delete('/reservations', async (req, res) => {
  try {
    const args = req.body;
    if (!args?.uuid) {
      return res.status(400).json({ error: 'missing uuid' });
    }

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `UPDATE reservations
      SET is_deleted=1, deleted_at=NOW()
      WHERE uuid = ?;`;
    const [results] = await conn.query(sql, [args.uuid]);
    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/waitlist', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT * FROM waitlists WHERE is_deleted=0;`;
    const [results] = await conn.query(sql);
    conn.end();

    results.map((x) => {
      x.formattedDate = format(x.date_slot, 'MM/dd');
    });

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/waitlist', async (req, res) => {
  try {
    const args = req.body;
    if (!args?.uuid) {
      return res.status(400).json({ error: 'missing uuid' });
    }
    const updateArgs = [
      args.name,
      args.email,
      args.seats,
      args.adult_seats,
      args.child_seats,
      args.uuid,
    ];

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `UPDATE waitlists
      SET name=?, email=?, seats=?, adult_seats=?, child_seats=?
      WHERE uuid = ?;`;
    const [results] = await conn.query(sql, updateArgs);
    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.delete('/waitlist', async (req, res) => {
  try {
    const args = req.body;
    if (!args?.uuid) {
      return res.status(400).json({ error: 'missing uuid' });
    }

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `UPDATE waitlists
      SET is_deleted=1, deleted_at=NOW()
      WHERE uuid = ?;`;
    const [results] = await conn.query(sql, [args.uuid]);
    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/openseats', async (req, res) => {
  try {
    const args = req.body;
    const searchDate = format(parseISO(args.date_slot), 'yyyy-MM-dd');
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT id, date_slot, time_slot, availableSeats
    FROM (SELECT timeslots.*,
          timeslots.available_seats AS totalSeats,
          IFNULL(SUM(reservations.reserved_seats),0) AS reservedSeats, 
          (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
          FROM timeslots 
          LEFT JOIN reservations AS reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
          WHERE timeslots.date_slot=?
          GROUP BY timeslots.id
          ORDER BY timeslots.date_slot, timeslots.time_slot) AS timeslots
          WHERE availableSeats > 0;`;
    const [results] = await conn.query(sql, [searchDate]);
    conn.end();

    results.map((x) => {
      const resDateTime = new Date(
        format(x.date_slot, 'yyyy-MM-dd') + 'T' + x.time_slot
      );
      x.displayValue = `${x.availableSeats} open seats : ${format(
        resDateTime,
        'eeee MM/dd @ hh:mm aaa'
      )}`;
      x.date_slot = format(x.date_slot, 'yyyy-MM-dd');
    });

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/openseats', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT id, date_slot, time_slot, availableSeats
    FROM (SELECT timeslots.*,
          timeslots.available_seats AS totalSeats,
          IFNULL(SUM(reservations.reserved_seats),0) AS reservedSeats, 
          (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
          FROM timeslots 
          LEFT JOIN reservations AS reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
          GROUP BY timeslots.id
          ORDER BY timeslots.date_slot, timeslots.time_slot) AS timeslots
          WHERE availableSeats > 0;`;
    const [results] = await conn.query(sql);
    conn.end();

    results.map((x) => {
      const resDateTime = new Date(
        format(x.date_slot, 'yyyy-MM-dd') + 'T' + x.time_slot
      );

      x.displayValue = format(resDateTime, 'MM/dd/yyyy @ hh:mm aaa');
      x.displayDay = format(x.date_slot, 'eeee');
    });

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/assignseats', async (req, res) => {
  try {
    const args = req.body;

    const conn = await mysql.createConnection(mysqlServer);
    const sqlTimeSlot = `SELECT * FROM timeslots WHERE id=?;`;
    const [resultsTimeSlot] = await conn.query(sqlTimeSlot, [args.slotId]);
    if (resultsTimeSlot.length === 0) {
      return res.status(400).json({ error: 'no timeslot available' });
    }

    const totalSeats = +args.seats.adult + +args.seats.child;
    const insertArgs = [
      args.uuid,
      args.slotId,
      format(resultsTimeSlot[0].date_slot, 'yyyy-MM-dd'),
      resultsTimeSlot[0].time_slot,
      totalSeats,
      args.seats.adult,
      args.seats.child,
      args.name,
      args.phone,
      args.email,
      args.slotId,
      totalSeats,
    ];

    const sql = `INSERT INTO reservations (uuid, slot_id, date_slot, time_slot, reserved_seats, adult_seats, child_seats, name, phone, email, reservation_complete)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1 FROM
      (SELECT (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
          FROM timeslots
          LEFT JOIN reservations AS reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
          WHERE timeslots.id=?
          GROUP BY timeslots.id) AS available
          WHERE available.availableSeats >= ?;`;
    const [results] = await conn.query(sql, insertArgs);

    if (results.insertId === 0) {
      conn.end();

      return res.status(400).json({ error: 'not enough room' });
    } else {
      const sql = `UPDATE waitlists
        SET is_deleted=1, deleted_at=NOW(), seats_given=?
        WHERE uuid = ?;`;
      const [resultsUpdate] = await conn.query(sql, [totalSeats, args.uuid]);

      sms({ uuid: args.uuid });
      email({ uuid: args.uuid });
    }

    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

module.exports = router;
