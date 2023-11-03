const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const path = require('path');
const { mysqlServer } = require('../connection');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const isProduction = process.env.NODE_ENV === 'production';

const { ApiError, Client, Environment } = require('square');

const { randomUUID } = require('crypto');

const client = new Client({
  environment: isProduction ? Environment.Production : Environment.Sandbox,
  //environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

BigInt.prototype.toJSON = function() {
  return this.toString();
};

const freeCode = 'free2024';
const cashCode = 'cash2024';

async function generalSms(args) {
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
async function generalEmail(args) {
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
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Confirmation',
      templateId: 'd-0aeac20b7eae429ca69c3f2563828d90',
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

async function hostessSms(uuid) {
  if (!uuid) {
    return { error: 'uuid is required' };
  }
  const conn = await mysql.createConnection(mysqlServer);

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const attendee = await getAttendee(conn, uuid);
    const eventDateFormatted = format(attendee.eventDate, 'eeee MMMM do');

    const body = `Your a Refuge Ball 2024 table hostess!
We have your hostess spots reserved for ${eventDateFormatted}.
More info will follow!`;

    const foo = await client.messages
      .create({
        body: body,
        from: '+13203453479',
        to: attendee.phone,
      })
      .then(async (message) => {
        console.log('text sent');

        const sqlUpdate = `UPDATE eventAttendees SET confirmation_text_sent=1 WHERE uuid=?;`;
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
async function hostessEmail(uuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!uuid) {
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendee(conn, uuid);

    const eventDateFormatted = format(attendee.eventDate, 'eeee MMMM do');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee.email,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Confirmation',
      templateId: 'd-0aeac20b7eae429ca69c3f2563828d90',
      dynamicTemplateData: {
        name: attendee.name,
        date: eventDateFormatted,
      },
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent');

        const sqlUpdate = `UPDATE eventAttendees SET confirmation_email_sent=1 WHERE uuid=?;`;
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

async function inviteAttendeeEmail(uuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!uuid) {
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendee(conn, uuid);

    const eventDateFormatted = format(attendee.eventDate, 'eeee MMMM do');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee.email,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Special Invitation!',
      templateId: 'd-32a8065be9484efda98412c347beba26',
      dynamicTemplateData: {
        name: attendee.name,
        date: eventDateFormatted,
        hostessName:attendee.hostessName,
        uniqueUrl:`https://refugeball.com/register/${uuid}`,
      },
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent');

        const sqlUpdate = `UPDATE eventAttendees SET invitation_email_sent=1 WHERE uuid=?;`;
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





async function getCosts(dbConn) {
  const sql = `SELECT * FROM eventCosts WHERE id=1;`;
  const results = await dbConn.query(sql);

  const costs = results[0][0];
  return costs;
}

async function getAttendee(dbConn, uuid) {
  const sql = `SELECT eventAttendees.*, hostessData.name AS hostessName, eventPayments.cardBrand, eventPayments.last4, eventPayments.amount, eventPayments.receiptUrl
  FROM eventAttendees 
  LEFT JOIN eventPayments ON eventAttendees.uuid = eventPayments.uuid
  LEFT JOIN eventAttendees AS hostessData ON hostessData.eventDate = eventAttendees.eventDate AND  hostessData.tableNumber = eventAttendees.tableNumber AND hostessData.isHostess=1
  WHERE eventAttendees.uuid=?;`;
  const results = await dbConn.query(sql, [uuid]);

  const data = results[0][0];
  return data;
}

async function calculateTotalPrice(dbConn, uuid) {
  const costs = await getCosts(dbConn);
  const attendee = await getAttendee(dbConn, uuid);

  let chargeAmount = costs.general;
  if (attendee.isHostess) {
    chargeAmount = costs.hostess;
  }
  if (attendee.specialDinner) {
    chargeAmount += costs.specialDinner;
  }

  return { charge: chargeAmount * 100, display: chargeAmount };
}

router.get('/hostessEmail', async (req, res) => {
  try {
    const emailResponce = await hostessEmail(req.query.uuid);
    const textResponce = await hostessSms(req.query.uuid);

    return res.status(200).json({ textResponce, emailResponce });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

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

    if (now >= generalOpenDateTime && now <= generalCloseDateTime) {
      status = 'general';
    }
    if (now >= hostessOpenDateTime && now <= hostessCloseDateTime) {
      status = 'hostess';
    }

    return res.status(200).json({ status });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.get('/getCosts', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const costs = await getCosts(conn);
    conn.end();

    return res.status(200).json(costs);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/cancel', async (req, res) => {
  try {
    const args = req.body;
    const sqlA = `UPDATE eventAttendees
    LEFT JOIN eventTables ON eventAttendees.id = eventTables.hostessId
    SET eventTables.hostessId = null
    WHERE eventAttendees.uuid=?;`;
    const sqlB = `DELETE FROM eventAttendees WHERE uuid=?;`;
    const conn = await mysql.createConnection(mysqlServer);
    const resultsA = await conn.query(sqlA, [args.uuid]);
    const resultsB = await conn.query(sqlB, [args.uuid]);

    conn.end();

    return res.status(200).json('canceled');
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

    const returnData = results.map((x) => {
      return {
        eventDate: format(x.eventDate, 'yyyy-MM-dd'),
        tableAvailable: x.tablesAvailable,
      };
    });

    return res.status(200).json(returnData);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/calculateTotalPrice', async (req, res) => {
  try {
    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);

    const chargeAmount = await calculateTotalPrice(conn, args.uuid);
    conn.end();

    return res.status(200).json(chargeAmount);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/reserveHostess', async (req, res) => {
  try {
    const args = req.body;
    const uuid = uuidv4();

    const isFree = args.specialCode === freeCode ? true : false;
    const paidCash = args.specialCode === cashCode ? true : false;
    const isHostess = args.ticketOptions.includes('hostess') ? 1 : 0;
    const specialDinner = args.ticketOptions.includes('specialDinner') ? 1 : 0;

    const conn = await mysql.createConnection(mysqlServer);

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
      args.specialCode,
      tableResults[0][0].tableNumber,
      uuid,
      isHostess,
      specialDinner,
    ];
    const sql = `INSERT INTO eventAttendees 
      SET name=?, phone=?, email=?, eventDate=?, specialCode=?, tableNumber=?, uuid=?, isHostess=?, specialDinner=?, created=NOW();`;
    const results = await conn.query(sql, updateArgs);

    const hostessId = results[0].insertId;

    const sqlTableNumberUpdate = `UPDATE eventTables
    SET eventTables.hostessId=${hostessId}
    WHERE eventTables.id=${tableResults[0][0].id};`;
    const resultsUpdate = await conn.query(sqlTableNumberUpdate);

    if (paidCash || isFree) {
      if (paidCash) {
        const updateRegistration = await conn.query(`UPDATE eventAttendees
        SET hasPaid=1, paidCash=1
        WHERE uuid="${uuid}";`);
      }

      if (isFree) {
        const updateRegistration = await conn.query(`UPDATE eventAttendees
        SET hasPaid=1, isFree=1
        WHERE uuid="${uuid}";`);
      }

      if (isHostess) {
        hostessEmail(uuid);
        hostessSms(uuid);
      }
    }

    conn.end();

    if (paidCash || isFree) {
      return res
        .status(200)
        .json({ success: 'good to go', uuid, continue: 'confirm' });
    }

    if (results[0].affectedRows > 0) {
      return res
        .status(200)
        .json({ success: 'good to go', uuid, continue: 'payment' });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/reserveInvitee', async (req, res) => {
  try {
    const args = req.body;
    const uuid = args.attendee.uuid;
    const isFree = args.specialCode === freeCode ? true : false;
    const paidCash = args.specialCode === cashCode ? true : false;
    const specialDinner = args.ticketOptions.includes('specialDinner') ? 1 : 0;

    const conn = await mysql.createConnection(mysqlServer);

    const updateArgs = [
      args.attendee.name,
      args.attendee.phone,
      args.attendee.email,
      args.specialCode,
      specialDinner,
      paidCash,
      isFree,
      paidCash || isFree ? true : false,
      uuid,
    ];
    const sql = `UPDATE eventAttendees 
      SET name=?, phone=?, email=?, specialCode=?, specialDinner=?, paidCash=?, isFree=?, hasPaid=?, modified=NOW()
      WHERE  uuid=?;`;
    const results = await conn.query(sql, updateArgs);

    // const sqlTableNumberUpdate = `UPDATE eventTables
    // SET eventTables.hostessId=${hostessId}
    // WHERE eventTables.id=${tableResults[0][0].id};`;
    // const resultsUpdate = await conn.query(sqlTableNumberUpdate);

    // if (isHostess) {
    //   hostessEmail(uuid);
    //   hostessSms(uuid);
    // }

    conn.end();

    if (paidCash || isFree) {
      return res
        .status(200)
        .json({ success: 'good to go', uuid, continue: 'confirm' });
    }

    if (results[0].affectedRows > 0) {
      return res
        .status(200)
        .json({ success: 'good to go', uuid, continue: 'payment' });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/inviteAttendee', async (req, res) => {
  try {
    const args = req.body;
    const newUuid = uuidv4();
    const conn = await mysql.createConnection(mysqlServer);

    const hostess = await getAttendee(conn, args.uuid);

    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      hostess.eventDate,
      hostess.tableNumber,
      newUuid,
    ];
    const sql = `INSERT INTO eventAttendees 
      SET name=?, phone=?, email=?, eventDate=?, tableNumber=?, uuid=?, created=NOW();`;
    const results = await conn.query(sql, updateArgs);

    const attendeeId = results[0].insertId;

    await inviteAttendeeEmail(newUuid);

    conn.end();

    if (results[0].affectedRows > 0) {
      return res.status(200).json({ success: 'good to go', newUuid });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/transferAttendee', async (req, res) => {
  try {
    const args = req.body;
    const newUuid = uuidv4();
    const conn = await mysql.createConnection(mysqlServer);

    const attendee = await getAttendee(conn, args.uuid);
    const originalData = [JSON.parse(attendee.originalData), attendee];

    const updateArgs = [
      args.name,
      args.phone,
      args.email,
      JSON.stringify(originalData),
      args.uuid,
    ];
    const sql = `UPDATE eventAttendees 
      SET name=?, phone=?, email=?, originalData=?
      WHERE uuid=?;`;
    const results = await conn.query(sql, updateArgs);

    const attendeeId = results[0].insertId;

    await inviteAttendeeEmail(args.uuid);

    conn.end();

    if (results[0].affectedRows > 0) {
      return res.status(200).json({ success: 'good to go', newUuid });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/removeAttendee', async (req, res) => {
  try {
    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);
    const attendee = await getAttendee(conn, args.uuid);

    const sql = `UPDATE eventAttendees 
      SET eventDate=null, tableNumber=null, name=null, phone=null, email=null, deleted=NOW(), originalData=?
      WHERE uuid=?;`;
    const results = await conn.query(sql, [
      JSON.stringify(attendee),
      args.uuid,
    ]);

    const attendeeId = results[0].insertId;

    conn.end();

    if (results[0].affectedRows > 0) {
      return res.status(200).json({ success: 'good to go', uuid: args.uuid });
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/getTableAttendees', async (req, res) => {
  try {
    const args = req.body;

    const conn = await mysql.createConnection(mysqlServer);

    const sqlTableAttendees = `SELECT * FROM eventAttendees 
      WHERE eventDate = ? 
      AND tableNumber = ? 
      ORDER BY isHostess DESC, name ASC;`;

    const tableResults = await conn.query(sqlTableAttendees, [
      args.eventDate,
      args.tableNumber,
    ]);
    conn.end();

    return res.status(200).json(tableResults[0]);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});
// SELECT * FROM `waters_refuge_ball`.`eventAttendees` WHERE `eventDate` = '2024-04-12' AND `tableNumber` = '24' ORDER BY `created` DESC LIMIT 0,1000

router.post('/payment', async (req, res) => {
  try {
    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);

    const chargeAmount = await calculateTotalPrice(conn, args.uuid);
    const attendee = await getAttendee(conn, args.uuid);
    //console.log(attendee);
    //console.log(chargeAmount);

    let squareResults;

    try {
      const processResults = await client.paymentsApi.createPayment({
        locationId: process.env.SQUARE_LOCATION_ID,
        sourceId: args.sourceId,
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: chargeAmount.charge,
          currency: 'USD',
        },
        reference_id: args.uuid,
        buyer_email_address: attendee.email,
        note: `Refuge Ball ${process.env.REFUGE_BALL_YEAR}: Hostess: ${attendee.name}: ${attendee.phone}`,
      });
      squareResults = processResults.result.payment;
      //console.log(squareResults);
    } catch (err) {
      if (err instanceof ApiError) {
        // likely an error in the request. don't retry
        console.log(err.errors);
        return res
          .status(err.statusCode)
          .json({ result: 'error', squareResults: { status: err.errors } });
      } else {
        logger.error(`Error creating payment on attempt ${attempt}: ${err}`);
        return res.status(err.statusCode).json({
          result: 'error',
          squareResults: { status: err.errors, error: err },
        });
      }
    }

    const paidSQL = `INSERT INTO eventPayments 
    SET created=NOW(), uuid=?, payment=?, paymentId=?, orderId=?, receiptUrl=?, status=?, cardBrand=?, last4=?, amount=?;`;
    const paidResults = await conn.query(paidSQL, [
      args.uuid,
      JSON.stringify(squareResults),
      squareResults.id,
      squareResults.orderId,
      squareResults.receiptUrl,
      squareResults.status,
      squareResults.cardDetails.card.cardBrand,
      squareResults.cardDetails.card.last4,
      squareResults.approvedMoney.amount,
    ]);

    const paidSQLUpdate = `UPDATE eventAttendees 
    SET hasPaid=1
    WHERE uuid=?;`;
    const paidUpdateResults = await conn.query(paidSQLUpdate, [args.uuid]);

    if (attendee.isHostess) {
      hostessEmail(args.uuid);
      hostessSms(args.uuid);
    }

    conn.end();

    return res.status(200).json({ result: 'success', squareResults });
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ result: 'error', squareResults: { status: 'ERROR' } });
  }
});

router.post('/getAttendee', async (req, res) => {
  try {
    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);
    const attendee = await getAttendee(conn, args.uuid);
    conn.end();


    // if the attendee his no longer valid
    if( !attendee || attendee.deleted){
      return res.status(200).json({error: 'Invitation no longer valid.'});
    }

    attendee.eventDate = format(attendee.eventDate, 'yyyy-MM-dd');

    return res.status(200).json(attendee);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

// router.get('/dates', async (req, res) => {
//   try {
//     //       WHERE timeslots.showAfter <= DATE_SUB(NOW(), INTERVAL 5 HOUR)

//     const conn = await mysql.createConnection(mysqlServer);
//     const sql = `SELECT eventTables.*, COUNT(attendees.id) AS seatsFilled, (eventTables.seats - COUNT(attendees.id)) AS openSeats, if(attendees.isHostess, 1, 0) AS hasHostess, if(attendees.isHostess, attendees.name, '') AS hostessName
//     FROM eventTables
//     LEFT JOIN eventAttendees AS attendees ON eventTables.eventDate = attendees.eventDate AND eventTables.tableNumber = attendees.tableNumber
//     GROUP BY eventTables.id;`;
//     const [results] = await conn.query(sql);
//     conn.end();

//     const returnData = results.map((x) => {
//       return {
//         eventDate: format(x.eventDate, 'yyyy-MM-dd'),
//         tableNumber: x.tableNumber,
//         openSeats: x.openSeats,
//         hasHostess: x.hasHostess,
//         hostessName: x.hostessName,
//       };
//     });

//     return res.status(200).json(returnData);
//   } catch (err) {
//     console.error(err);
//     return res.status(400).json(err);
//   }
// });

module.exports = router;
