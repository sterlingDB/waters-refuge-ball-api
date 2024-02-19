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


/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Email and SMS functions - Start
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/


    /*
          Hostess signup confirmation Email & SMS
            Refuge Ball Registration: Confirmation: Hostess
                d-0aeac20b7eae429ca69c3f2563828d90
    */
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
        dashboardUrl:`https://refugeball.com/hostess/${attendee.uuid}`
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
More info will follow!

Here is your Hostess Dashboard, Don't share it!
https://refugeball.com/hostess/${attendee.uuid}
`;

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


    /*
          Hostess Invites an attendee to the table: special invite: Email & SMS
            Refuge Ball Registration: Invitation: Hostess to Attendee
                d-32a8065be9484efda98412c347beba26
    */
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
      cc: attendee.hostessEmail,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Special Invitation!',
      templateId: 'd-32a8065be9484efda98412c347beba26',
      dynamicTemplateData: {
        name: attendee.name,
        date: eventDateFormatted,
        hostessName:attendee.hostessName,
        hostessFirstName:attendee.hostessName.split(' ')[0],
        hostessEmail:attendee.hostessEmail,
        uniqueUrl:`https://refugeball.com/register/${uuid}`,
      },
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent');

        const sqlUpdate = `UPDATE eventAttendees SET inviteEmailDate=NOW() WHERE uuid=?;`;
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
async function inviteAttendeeSms(uuid) {
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

    const body = `${attendee.hostessName} has invited you to attend the Refuge Ball!

Here is your unique link to complete registration.

https://refugeball.com/register/${uuid}
`;

    const foo = await client.messages
      .create({
        body: body,
        from: '+13203453479',
        to: attendee.phone,
      })
      .then(async (message) => {
        console.log('text sent');

        const sqlUpdate = `UPDATE eventAttendees SET inviteSmsDate=NOW() WHERE uuid=?;`;
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

    /*
          Invited Attendee Registration: confirmation Email & SMS
            Refuge Ball Registration: Confirmation: Invited Attendee
                d-8303e70d62c8426ab1da2c5a57cf86fc
    */
async function inviteeConfirmationEmail(uuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!uuid) {
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendee(conn, uuid);
    const eventDateFormatted = format(attendee.eventDate, 'eeee MMMM do');

    let options = '';
    if(attendee.specialDinner){
      options += 'Special Dinner: Vegan and Gluten Free'
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee.email,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Registration Confirmation',
      templateId: 'd-8303e70d62c8426ab1da2c5a57cf86fc',
      dynamicTemplateData: {
        name: attendee.name,
        date: eventDateFormatted,
        hostessName:attendee.hostessName,
        hostessEmail:attendee.hostessEmail,
        options: options
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


    /*
          General Registration: confirmation Email & SMS
            Refuge Ball Registration: Confirmation: General
                d-4af898133b5f4d9abf294a3b72e0fc88
    */
async function generalAttendeeEmail(masterUuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!masterUuid) {
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendeesByMasterId(conn, masterUuid);

    const eventDateFormatted = format(attendee[0].eventDate, 'eeee MMMM do');

    const emailData = {
      hostessName: attendee[0].hostessName,
      hostessEmail: attendee[0].hostessEmail,
      name: attendee[0].name,
      email: attendee[0].email,
      phone: attendee[0].phone,
      specialDinner: attendee[0].specialDinner,
      date: eventDateFormatted,
      uniqueUrl:`https://refugeball.com/group/manage/${masterUuid}`,
    }
    
    if(attendee.length >= 2){
      emailData.attendee2 = attendee[1].name;
      emailData.specialDinner2 = attendee[1].specialDinner

    }
    if(attendee.length >= 3){
      emailData.attendee3 = attendee[2].name;
      emailData.specialDinner3 = attendee[2].specialDinner
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee[0].email,
      //cc: attendee.hostessEmail,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Registration!',
      templateId: 'd-4af898133b5f4d9abf294a3b72e0fc88',
      dynamicTemplateData: emailData,
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent');

        const sqlUpdate = `UPDATE eventAttendees SET confirmation_email_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [masterUuid]);
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
async function generalAttendeeSms(masterUuid) {
  if (!masterUuid) {
    return { error: 'masterUuid is required' };
  }
  const conn = await mysql.createConnection(mysqlServer);

  
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    const attendee = await getAttendeesByMasterId(conn, masterUuid);

    const eventDateFormatted = format(attendee[0].eventDate, 'eeee MMMM do');

    const attendeeBody = []
    let pushData = [`Attendee:\r   ${attendee[0].name}`]
    if(attendee[0].specialDinner){
      pushData.push('Special Dinner')
    }
    attendeeBody.push(pushData.join(': '))

    if(attendee.length >= 2){
       pushData = [`Attendee 2:\r   ${attendee[1].name}`]
      if(attendee[1].specialDinner){
        pushData.push('Special Dinner')
      }
      attendeeBody.push(pushData.join(': '))
    }
    if(attendee.length >= 3){
       pushData = [`Attendee 3:\r   ${attendee[2].name}`]
      if(attendee[2].specialDinner){
        pushData.push('Special Dinner')
      }
      attendeeBody.push(pushData.join(': '))
    }


    const body = `Your going to the Refuge Ball!
    ${eventDateFormatted}

    ${attendeeBody.join('\r')}

    Here is your unique link to update your registration if needed.
    https://refugeball.com/group/manage/${masterUuid}`;

    const foo = await client.messages
      .create({
        body: body,
        from: '+13203453479',
        to: attendee[0].phone,
      })
      .then(async (message) => {
        console.log('text sent');

        const sqlUpdate = `UPDATE eventAttendees SET confirmation_text_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [masterUuid]);

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


async function generalAttendeeNotifyHostessEmail(masterUuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!masterUuid) {
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendeesByMasterId(conn, masterUuid);

    const eventDateFormatted = format(attendee[0].eventDate, 'eeee MMMM do');

    const emailData = {
      hostessName: attendee[0].hostessName,
      hostessEmail: attendee[0].hostessEmail,
      name: attendee[0].name,
      email: attendee[0].email,
      phone: attendee[0].phone,
      date: eventDateFormatted,
    }
    
    if(attendee.length >= 2){
      emailData.attendee2 = attendee[1].name;
    }
    if(attendee.length >= 3){
      emailData.attendee3 = attendee[2].name;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: 'jmorris@sterling-databases.com',
     // to: attendee[0].hostessEmail,
      //cc: attendee.hostessEmail,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball: Hostess Alert: Attendees assigned to your table',
      templateId: 'd-546ffc139d884996bfc142b102645286',
      dynamicTemplateData: emailData,
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log('Email sent: Hostess Alert: Attendees assigned to your table');

        // const sqlUpdate = `UPDATE eventAttendees SET confirmation_email_sent=1 WHERE uuid=?;`;
        // const [resultsUpdate] = await conn.query(sqlUpdate, [masterUuid]);
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

// test route to activate an email or sms function
router.get('/test/:uuid', async (req, res) => {
  const {uuid} = req.params
  await generalAttendeeEmail(uuid);
  return res.status(200).json({ uuid });
});


/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Email and SMS functions - End
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/




/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Functions: shared within routes
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/
async function getCosts(dbConn) {
  const sql = `SELECT * FROM eventCosts WHERE id=1;`;
  const results = await dbConn.query(sql);

  const costs = results[0][0];
  return costs;
}
async function getAttendee(dbConn, uuid) {
  const sql = `SELECT eventAttendees.*, hostessData.name AS hostessName, hostessData.email AS hostessEmail, eventPayments.cardBrand, eventPayments.last4, eventPayments.amount, eventPayments.receiptUrl
  FROM eventAttendees 
  LEFT JOIN eventPayments ON eventAttendees.uuid = eventPayments.uuid
  LEFT JOIN eventAttendees AS hostessData ON hostessData.eventDate = eventAttendees.eventDate AND  hostessData.tableNumber = eventAttendees.tableNumber AND hostessData.isHostess=1
  WHERE eventAttendees.uuid=?
  AND eventAttendees.deleted IS NULL;;`;
  const results = await dbConn.query(sql, [uuid]);

  const data = results[0][0];
  return data;
}
async function getAttendeesByMasterId(dbConn, masterUuid) {
  const sql = `SELECT eventAttendees.*, hostessData.name AS hostessName, hostessData.email AS hostessEmail, eventPayments.cardBrand, eventPayments.last4, eventPayments.amount, eventPayments.receiptUrl
  FROM eventAttendees 
  LEFT JOIN eventPayments ON eventAttendees.uuid = eventPayments.uuid
  LEFT JOIN eventAttendees AS hostessData ON hostessData.eventDate = eventAttendees.eventDate AND  hostessData.tableNumber = eventAttendees.tableNumber AND hostessData.isHostess=1
  WHERE eventAttendees.masterAttendeeUuid=?
  AND eventAttendees.deleted IS NULL;`;
  const results = await dbConn.query(sql, [masterUuid]);

  const data = results[0];
  return data;
}
async function calculateTotalPrice(dbConn, uuid) {

  if(!uuid){
    return  "error" ;
  }

  const costs = await getCosts(dbConn);
  const attendee = await getAttendee(dbConn, uuid);
  let chargeAmount = 0
  let allAttendees = []

  if(attendee?.masterAttendeeUuid){
    allAttendees = await getAttendeesByMasterId(dbConn, attendee.masterAttendeeUuid)
  }


  if(allAttendees.length>0){
    allAttendees.forEach(x => {
      if (!x.isHostess) {
        chargeAmount += costs.general;
      }
      if (x.isHostess) {
        chargeAmount += costs.hostess;
      }
      if (x.specialDinner) {
        chargeAmount += costs.specialDinner;
      }
    })
  }else{
   chargeAmount = costs.general;
    if (attendee.isHostess) {
      chargeAmount = costs.hostess;
    }
    if (attendee.specialDinner) {
      chargeAmount += costs.specialDinner;
    }

  }




  return { charge: chargeAmount * 100, display: chargeAmount };
}
async function autoDeletes(dbConn){

  // general deletes
  const sqlA = `DELETE
  FROM waters_refuge_ball.eventAttendees 
  WHERE eventAttendees.hasPaid=0
  AND eventAttendees.isHostess=0
  AND eventAttendees.wasInvited=0
  AND (eventAttendees.created + INTERVAL 15 MINUTE) < NOW();`;

  const sqlB = `
  UPDATE waters_refuge_ball.eventTables 
  LEFT JOIN eventAttendees ON eventTables.hostessId=eventAttendees.id
  SET eventTables.hostessId = NULL
  WHERE eventTables.hostessId IS NOT NULL
  AND eventAttendees.hasPaid=0
  AND (eventAttendees.created + INTERVAL 15 MINUTE) < NOW();`;

  const sqlC = `
  DELETE FROM  waters_refuge_ball.eventAttendees
  WHERE eventAttendees.id IN (SELECT eventAttendees.id
  FROM waters_refuge_ball.eventAttendees 
  LEFT JOIN eventTables ON eventTables.hostessId=eventAttendees.id
  WHERE eventAttendees.hasPaid=0
  AND eventAttendees.isHostess=1
  AND eventTables.id IS NULL
  AND (eventAttendees.created + INTERVAL 15 MINUTE) < NOW());`;

  const resultsA = await dbConn.query(sqlA);
  const resultsB = await dbConn.query(sqlB);
  const resultsC = await dbConn.query(sqlC);

  return [resultsA,resultsB,resultsC];

}




/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: autorun cleanup
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/

router.get('/autoCleanup', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);
    const results = await autoDeletes(conn);
    conn.end();

    return res.status(200).json(results);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});


/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes that send email & sms
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/
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

router.post('/sendAnotherEmail', async (req, res) => {
  try {
    
    const emailResponce = await inviteAttendeeEmail(req.body.uuid);
    //console.log(req.body.uuid)

    return res.status(200).json({ emailResponce });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/sendAnotherText', async (req, res) => {
  try {
    const textResponce = await inviteAttendeeSms(req.body.uuid);
    //console.log(req.body.uuid)

    return res.status(200).json({ textResponce });
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});



/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: create reservations
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/
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
      args.notes,
      args.eventDate,
      args.specialCode,
      tableResults[0][0].tableNumber,
      uuid,
      isHostess,
      specialDinner,
    ];
    const sql = `INSERT INTO eventAttendees 
      SET name=?, phone=?, email=?, notes=?, eventDate=?, specialCode=?, tableNumber=?, uuid=?, isHostess=?, specialDinner=?, created=NOW();`;
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

router.post('/reserveGeneralHold', async (req,res) => {
  
  const args = req.body;
  const conn = await mysql.createConnection(mysqlServer);

  const sqlTableNumber = `SELECT * FROM (SELECT eventTables.*, COUNT(eventAttendees.id) AS attendeeCount, (eventTables.seats-COUNT(eventAttendees.id)) AS seatsAvailable
  FROM waters_refuge_ball.eventTables
  LEFT JOIN eventAttendees ON eventTables.eventDate = eventAttendees.eventDate AND eventTables.tableNumber = eventAttendees.tableNumber
  GROUP BY eventTables.id) AS availableTables
  WHERE availableTables.seatsAvailable > ?
  AND eventDate = ?
  ORDER BY seatsAvailable ASC
  LIMIT 0,1;`;
 
  const tableResults = await conn.query(sqlTableNumber, [args.ticketCount, args.eventDate]);
  
  const masterAttendeeUuid = uuidv4();
  const returnUuids = [masterAttendeeUuid]


  for(let count = 1; count <= +args.ticketCount; count++){
      console.log(count)

        const thisUuid = uuidv4()
        if(count!= 1){returnUuids.push(thisUuid)}

        const dbArgs = [
          args.eventDate,
          tableResults[0][0].tableNumber,
          count===1 ? masterAttendeeUuid : thisUuid,
          masterAttendeeUuid
        ];
        const sql = `INSERT INTO eventAttendees 
            SET eventDate=?, tableNumber=?, uuid=?, masterAttendeeUuid=?, created=NOW();`;
        const results = await conn.query(sql, dbArgs);

  }



  await conn.end();

  return res.status(200).json(returnUuids);



})

router.post('/reserveGeneralFetch', async (req,res) => {
  
  const args = req.body;
  const masterAttendeeUuid = args.masterUuid;

  const conn = await mysql.createConnection(mysqlServer);

  const sqlAttendees = `SELECT uuid FROM eventAttendees
  WHERE masterAttendeeUuid = ?
  ORDER BY id ASC;`;
 
  const attendeeResults = await conn.query(sqlAttendees, [masterAttendeeUuid]);
  
  const returnUuids = []
  attendeeResults[0].forEach(x=>{
    returnUuids.push(x.uuid)
  })

  await conn.end();

  return res.status(200).json(returnUuids);

})

router.post('/reserveGeneral', async (req, res) => {
  try {
    const args = req.body;

    const mainUuid = args.registrationData.uuid
    const isFree = args.specialCode === freeCode ? true : false;
    const paidCash = args.specialCode === cashCode ? true : false;
    const conn = await mysql.createConnection(mysqlServer);

    const groupArray = [args.registrationData, args.registrationData2, args.registrationData3]
    const resultsArray = []
    let successCount = 0;

    // loop for each registration
    for (const x of groupArray) {
      const updateArgs = [
        x.name,
        x.phone,
        x.email,
        args.eventDate,
        args.specialCode,
        x.options.includes('specialDinner') ? 1 : 0,
        paidCash,
        isFree,
        (paidCash || isFree),
        x.notes, 
        x.uuid,
      ];
        
      const sql = `UPDATE eventAttendees 
          SET name=?, phone=?, email=?, eventDate=?, specialCode=?, specialDinner=?, 
          paidCash=?, isFree=?, hasPaid=?, notes=?, modified=NOW()
        WHERE  uuid=?;`;
      const results = await conn.query(sql, updateArgs)
      resultsArray.push(results[0].affectedRows);
      successCount +=results[0].affectedRows
    }
    if(conn) conn.end();

    if (paidCash || isFree) {

      await generalAttendeeSms(mainUuid);
      await generalAttendeeEmail(mainUuid);

      return res
        .status(200)
        .json({ success: 'good to go', mainUuid, continue: 'confirm' });
    }

    if (successCount === +args.ticketCount) {
      await generalAttendeeSms(mainUuid);
      await generalAttendeeEmail(mainUuid);
      return res
        .status(200)
        .json({ success: 'good to go', mainUuid, continue: 'payment' });
    } else {
      return res.status(400).json({ error: 'No hold found' });
      // return res
      // .status(200)
      // .json({ success: 'good to go', mainUuid, continue: 'payment' });

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


    conn.end();

    if (paidCash || isFree) {
      inviteeConfirmationEmail(uuid);
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

/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: Hostess dashboard
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/
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
      SET name=?, phone=?, email=?, eventDate=?, tableNumber=?, uuid=?, wasInvited=1, created=NOW();`;
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


/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: loading?
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/
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

router.post('/getAllAttendeeByMaster', async (req, res) => {
  try {
    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);

    let allAttendees = await getAttendeesByMasterId(conn, args.masterAttendeeUuid)
    if(allAttendees.length === 0){
      const singleAttendee = await getAttendee(conn, args.masterAttendeeUuid);
      if(singleAttendee) {
        allAttendees.push(singleAttendee)
      }
    }
    conn.end();


    // if the attendee is no longer valid
    if( allAttendees.length === 0){
      return res.status(200).json({error: 'No data found'});
    }

    allAttendees.forEach(x=>{
      x.eventDate = format(x.eventDate, 'yyyy-MM-dd');
    })

    return res.status(200).json(allAttendees);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/getMasterReservation', async (req, res) => {
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


/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: mutations
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/

router.post('/updateHostessNotes', async (req, res) => {
  try {

    const args = req.body;
    const conn = await mysql.createConnection(mysqlServer);
    const sqlTableNumber = `UPDATE eventAttendees SET notes =? WHERE uuid=?;`;
    const resultsUpdate = await conn.query(sqlTableNumber, [args.notes,args.uuid]);
    conn.end();

    if (resultsUpdate[0].affectedRows > 0) {
      return res
        .status(200)
        .json({ success: 'notes updated'});
    } else {
      return res.status(400).json({ error: 'no clue' });
    }
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

router.post('/updateGroupReservation', async (req, res) => {
  try {

    const {groupData} = req.body

    if(groupData.length > 0){
      const conn = await mysql.createConnection(mysqlServer);

      const sqlGroupDataUpdate = `UPDATE eventAttendees SET name=?, email=?, phone=?, notes=? WHERE uuid=?;`;
      const updateResults = []
       for await(const x of groupData){
        const individualResults = await conn.query(sqlGroupDataUpdate, [x.name, x.email, x.phone, x.notes, x.uuid ]);
        updateResults.push(individualResults[0].info)
      }
      conn.end();
  
      if (updateResults.length > 0) {
        return res
          .status(200)
          .json({ success: updateResults});
      } else {
        return res.status(400).json({ error: 'no clue' });
      }

    }else{
      return res.status(400).json({ error: 'no data' });

    }


   
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

/*  
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
      Routes: other
  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
*/

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

router.post('/getTableAttendees', async (req, res) => {
  try {
    const args = req.body;

    const conn = await mysql.createConnection(mysqlServer);

    const sqlTableAttendees = `SELECT 
    eventAttendees.*,
    IF(master.id IS NOT NULL, JSON_OBJECT( 'name', master.name, 'phone', master.phone, 'email', master.email), null)  as masterObject
    FROM eventAttendees 
    LEFT JOIN eventAttendees AS master ON eventAttendees.masterAttendeeUuid = master.masterAttendeeUuid
    WHERE eventAttendees.eventDate = ? 
    AND eventAttendees.tableNumber = ?
    GROUP BY eventAttendees.id
    ORDER BY eventAttendees.isHostess DESC, eventAttendees.name ASC;`;

    const tableResults = await conn.query(sqlTableAttendees, [
      args.eventDate,
      args.tableNumber,
    ]);
    conn.end();

    tableResults[0].forEach((attendee)=>{
      attendee.extra={hasPaid:'no', isHostess:'no'}

      if(attendee.hasPaid){
        attendee.extra.hasPaid='yes'
      }
      if(attendee.isHostess){
        attendee.extra.isHostess='yes'
      }
      if(attendee.masterObject){
        attendee.masterObject = JSON.parse(attendee.masterObject)
      }
      //debugger

    })

    return res.status(200).json(tableResults[0]);
  } catch (err) {
    console.error(err);
    return res.status(400).json(err);
  }
});

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

router.get('/status', async (req, res) => {
  try {
    const conn = await mysql.createConnection(mysqlServer);

    let status = [];
    const now = new Date();

    const sql = `SELECT * FROM system_status WHERE id=1;`;
    const [[results]] = await conn.query(sql);
    conn.end();

    const hostessOpenDateTime = new Date(results.hostessOpenDateTime);
    const hostessInviteCloseDateTime = new Date(results.hostessInviteCloseDateTime);
    const generalOpenDateTime = new Date(results.generalOpenDateTime);
    const generalCloseDateTime = new Date(results.generalCloseDateTime);

    if (now >= generalOpenDateTime && now <= generalCloseDateTime) {
      status.push('general');
    }
    if (now >= hostessOpenDateTime) {
      status.push('hostess');
    }
    if (now <= hostessInviteCloseDateTime) {
      status.push('hostessInvites');
    }

    if(status.length <= 0){
      status.push('closed')
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
  const args = req.body;
  const conn = await mysql.createConnection(mysqlServer);
  const attendee = await getAttendee(conn, args.uuid);

  if(attendee.invitation_email_sent==='0'){
    try {
      const sqlA = `UPDATE eventAttendees
      LEFT JOIN eventTables ON eventAttendees.id = eventTables.hostessId
      SET eventTables.hostessId = null
      WHERE eventAttendees.uuid=?;`;
      const sqlB = `DELETE FROM eventAttendees WHERE uuid=?;`;
      const resultsA = await conn.query(sqlA, [args.uuid]);
      const resultsB = await conn.query(sqlB, [args.uuid]);
  
      conn.end();
  
      return res.status(200).json('canceled');
    } catch (err) {
      console.error(err);
      return res.status(400).json(err);
    }
  }else{
    return res.status(200).json('canceled');
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

router.post('/generalDatesForTicketCount', async (req, res) => {
  try {
    const args = req.body;

    const conn = await mysql.createConnection(mysqlServer);
    const sql = `SELECT DISTINCT eventDate FROM (SELECT eventTables.*, COUNT(eventAttendees.id) AS attendeeCount, (eventTables.seats-COUNT(eventAttendees.id)) AS seatsAvailable
    FROM waters_refuge_ball.eventTables
    LEFT JOIN eventAttendees ON eventTables.eventDate = eventAttendees.eventDate AND eventTables.tableNumber = eventAttendees.tableNumber
    GROUP BY eventTables.id) AS foo
    WHERE foo.seatsAvailable >= ?;`;
    const [results] = await conn.query(sql, [args.count]);
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


module.exports = router;
