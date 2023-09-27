const mysql = require('mysql2/promise');
const format = require('date-fns/format');
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

router.get('/status', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);

    let status = 'closed';
    const now = new Date();

    const sql = `SELECT * FROM system_status WHERE id=1;`;
    const [[results]] = await conn.query(sql);
    conn.end();

    const hostessOpenDateTime = new Date(results.hostessOpenDateTime);
    const hostessCloseDateTime = new Date(results.hostessCloseDateTime);
    const generalOpenDateTime = new Date(results.generalOpenDateTime);
    const generalCloseDateTime = new Date(results.generalCloseDateTime);

    if (results.cast && now >= generalOpenDateTime && now <= generalCloseDateTime) {
      status = 'general';
    }
    if ((now >= hostessOpenDateTime && now <= hostessCloseDateTime)) {
      status = 'hostess';
    }

    return res.status(200).json({ status });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/availableForHosting', async (req, res) => {
  try {

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT tableData.eventDate, COUNT(*) AS tablesAvailable
    FROM (SELECT eventTables.eventDate, if(attendees.isHostess, 1, 0) AS hasHostess
    FROM eventTables
    LEFT JOIN eventAttendees AS attendees ON eventTables.eventDate = attendees.eventDate AND eventTables.tableNumber = attendees.tableNumber
    GROUP BY eventTables.id) AS tableData
    WHERE tableData.hasHostess = 0
    GROUP BY tableData.eventDate`;
    const [results] = await conn.query(sql);
    conn.end();

    const returnData = results.map((x) => {return {eventDate: format(x.eventDate, 'yyyy-MM-dd'), tableAvailable: x.tablesAvailable}});

    return res.status(200).json(returnData);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});


router.get('/dates', async (req, res) => {
  try {
    //       WHERE timeslots.showAfter <= DATE_SUB(NOW(), INTERVAL 5 HOUR)

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT eventTables.*, COUNT(attendees.id) AS seatsFilled, (eventTables.seats - COUNT(attendees.id)) AS openSeats, if(attendees.isHostess, 1, 0) AS hasHostess, if(attendees.isHostess, attendees.name, '') AS hostessName
    FROM eventTables
    LEFT JOIN eventAttendees AS attendees ON eventTables.eventDate = attendees.eventDate AND eventTables.tableNumber = attendees.tableNumber
    GROUP BY eventTables.id;`;
    const [results] = await conn.query(sql);
    conn.end();

    const returnData = results.map((x) => {return {eventDate: format(x.eventDate, 'yyyy-MM-dd'), tableNumber: x.tableNumber, openSeats: x.openSeats, hasHostess: x.hasHostess, hostessName: x.hostessName}});

    return res.status(200).json(returnData);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/reserveHostess', async (req, res) => {
  try {
    const args = req.body;

    // if (!args.uuid) {
    //   return res.status(400).json({ error: 'reservation not found' });
    // }

    const conn = await mysql.createConnection(mysqlServer);

    // const sqlResValid = `SELECT * FROM reservations WHERE uuid=?;`;
    // const resultsResValid = await conn.query(sqlResValid, [args.uuid]);
    // if (resultsResValid[0].length === 0) {
    //   conn.end();
    //   return res.status(400).json({ error: 'reservation not found' });
    // }

    // if (resultsResValid[0][0].is_deleted === 1) {
    //   conn.end();
    //   return res.status(400).json({ error: 'hold time has expired' });
    // }
    // if (resultsResValid[0][0].reservation_complete === 1) {
    //   conn.end();
    //   return res
    //     .status(400)
    //     .json({ success: 'reservation already completed, no more changes' });
    // }


    const sqlTableNumber = `SELECT eventTables.id, eventTables.eventDate, eventTables.tableNumber
    FROM eventTables
    WHERE eventTables.eventDate=?
    AND eventTables.hostessId IS NULL
    ORDER BY RAND()
    LIMIT 0,1;`;

    const tableResults = await conn.query(sqlTableNumber, [args.eventDate]);
    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      args.eventDate,
      tableResults[0][0].tableNumber
    ];
    const sql = `INSERT INTO eventAttendees 
      SET name=?, phone=?, email=?, eventDate=?, tableNumber=?,isHostess=1;`;
    const results = await conn.query(sql, updateArgs);

    const hostessId = results[0].insertId;

    const sqlTableNumberUpdate = `UPDATE eventTables
    SET eventTables.hostessId=${hostessId}
    WHERE eventTables.id=${tableResults[0][0].id};`;
    const resultsUpdate = await conn.query(sqlTableNumberUpdate);

    conn.end();

    let returnData;
    let emailResults;
    let smsResults;

    if (results[0].affectedRows > 0) {
      sms({ uuid: args.uuid });
      email({ uuid: args.uuid });

      return res.status(200).json({ success: 'good to go' });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});







router.post('/times', async (req, res) => {
  try {
    const args = req.body;
    if (!args.date) {
      return res.status(400).json({ error: 'no date passed' });
    }

    const conn = await mysql.createConnection(mysqlServer);

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

    const [results] = await conn.query(sql, args.date);
    conn.end();

    const returnData = results.map((x) => {
      return {
        id: x.id,
        time: x.time_slot,
        seats: {
          available: +x.availableSeats,
          reserverd: +x.reservedSeats,
          total: +x.totalSeats,
        },
        showAfter: format(x.showAfter, 'yyyy-MM-dd HH:mm:ss'),
      };
    });

    return res.status(200).json(returnData);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/hold', async (req, res) => {
  try {
    const args = req.body;

    if (args.seats <= 0)
      return res.status(400).json({ error: 'not enough seats' });

    const conn = await mysql.createConnection(mysqlServer);
    const uuid = uuidv4();

    const sqlTimeSlot = `SELECT * FROM timeslots WHERE id=?;`;
    const [resultsTimeSlot] = await conn.query(sqlTimeSlot, [args.slotId]);
    if (resultsTimeSlot.length === 0) {
      return res.status(400).json({ error: 'no timeslot available' });
    }

    const totalSeats = +args.seats.adult + +args.seats.child;
    const insertArgs = [
      uuid,
      args.slotId,
      format(resultsTimeSlot[0].date_slot, 'yyyy-MM-dd'),
      resultsTimeSlot[0].time_slot,
      totalSeats,
      args.seats.adult,
      args.seats.child,
      args.slotId,
      totalSeats,
    ];

    const sql = `INSERT INTO reservations (uuid, slot_id, date_slot, time_slot, reserved_seats, adult_seats, child_seats) 
      SELECT ?, ?, ?, ?, ?, ?, ? FROM 
      (SELECT (timeslots.available_seats - IFNULL(SUM(reservations.reserved_seats),0)) AS availableSeats
          FROM timeslots 
          LEFT JOIN reservations ON timeslots.id = reservations.slot_id AND reservations.is_deleted=0
          WHERE timeslots.id=?
          GROUP BY timeslots.id) AS available 
          WHERE available.availableSeats >= ?;`;
    const [results] = await conn.query(sql, insertArgs);
    conn.end();

    if (results.insertId > 0) {
      return res.status(200).json({ uuid });
    } else {
      return res.status(400).json({ error: 'not enough seats' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/reserve', async (req, res) => {
  try {
    const args = req.body;

    if (!args.uuid) {
      return res.status(400).json({ error: 'reservation not found' });
    }

    const conn = await mysql.createConnection(mysqlServer);

    const sqlResValid = `SELECT * FROM reservations WHERE uuid=?;`;
    const resultsResValid = await conn.query(sqlResValid, [args.uuid]);
    if (resultsResValid[0].length === 0) {
      conn.end();
      return res.status(400).json({ error: 'reservation not found' });
    }
    // if(resultsResValid[0][0].reserved_seats != ((+args.seats.adult) + (+args.seats.child))){
    //   conn.end();
    //   return res.status(400).json({error:"adult and child seats do not = reservation"});
    // }
    if (resultsResValid[0][0].is_deleted === 1) {
      conn.end();
      return res.status(400).json({ error: 'hold time has expired' });
    }
    if (resultsResValid[0][0].reservation_complete === 1) {
      conn.end();
      return res
        .status(400)
        .json({ success: 'reservation already completed, no more changes' });
    }
    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      args.cast,
      args.uuid,
    ];

    const sql = `UPDATE reservations 
      SET name=?, phone=?, email=?, cast_member_name=?, reservation_complete=1
      WHERE uuid = ?
      AND is_deleted=0
      AND reservation_complete=0;`;
    const results = await conn.query(sql, updateArgs);
    conn.end();

    let returnData;
    let emailResults;
    let smsResults;

    if (results[0].affectedRows > 0) {
      sms({ uuid: args.uuid });
      email({ uuid: args.uuid });

      //  axios.get('https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-abdb044a-388f-4e27-89e8-849a449d10f6/wtc/sendgrid', {
      //   params: {
      //     uuid: args.uuid
      //   }
      // })
      // .then(function (response) {
      //   console.log(response);
      //   emailResults = response;
      // })
      // .catch(function (error) {
      //   console.log(error);
      //   emailResults = error;
      // });

      //  axios.get('https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-abdb044a-388f-4e27-89e8-849a449d10f6/wtc/sms', {
      //   params: {
      //     uuid: args.uuid
      //   }
      // })
      // .then(function (response) {
      //   console.log(response);
      //   smsResults = response;
      // })
      // .catch(function (error) {
      //   console.log(error);
      //   smsResults = error;
      // });

      return res.status(200).json({ success: 'good to go' });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/cancel', async (req, res) => {
  const args = req.body;

  try {
    if (!args.uuid) return res.status(400).json({ error: 'invalid uuid' });

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `DELETE FROM reservations WHERE uuid=? AND reservation_complete=0;`;
    const results = await conn.query(sql, [args.uuid]);
    conn.end();

    return res.status(200).json({ success: 'good to go' });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/delete_holds', async (req, res) => {
  const args = req.body;

  try {
    const conn = await mysql.createConnection(mysqlServer);
    const sql = `DELETE FROM reservations WHERE reservation_complete=0 AND created_at < (NOW() - INTERVAL 5 MINUTE) AND is_deleted=0;`;
    const results = await conn.query(sql);
    conn.end();

    return res.status(200).json({ success: 'good to go' });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/waitlist', async (req, res) => {
  const args = req.body;

  try {
    if (!args.date) return res.status(400).json({ error: 'date required' });

    const uuid = uuidv4();

    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      args.date,
      +args.seats.adult + +args.seats.child,
      args.seats.adult,
      args.seats.child,
      uuid,
    ];

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `INSERT INTO waitlists
        (name, phone, email, date_slot, seats, adult_seats, child_seats, uuid) 
      VALUES (?,?,?,?,?,?,?,?);`;
    const results = await conn.query(sql, updateArgs);
    conn.end();

    let returnData;
    if (results[0].affectedRows > 0) {
      return res.status(200).json({ success: 'good to go' });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err });
  }
});

module.exports = router;
