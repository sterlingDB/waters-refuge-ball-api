const mysql = require("mysql2/promise");
const format = require("date-fns/format");
const path = require("path");
const { mysqlServer } = require("../connection");
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const sgMail = require("@sendgrid/mail");

async function getAttendee(dbConn, uuid) {
  const sql = `SELECT eventAttendees.*, hostessData.name AS hostessName, hostessData.email AS hostessEmail, eventPayments.cardBrand, eventPayments.last4, eventPayments.amount, eventPayments.receiptUrl
  FROM eventAttendees 
  LEFT JOIN eventPayments ON eventAttendees.uuid = eventPayments.uuid
  LEFT JOIN eventAttendees AS hostessData ON hostessData.eventDate = eventAttendees.eventDate AND  hostessData.tableNumber = eventAttendees.tableNumber AND hostessData.isHostess=1
  WHERE eventAttendees.uuid=?;`;
  const results = await dbConn.query(sql, [uuid]);

  const data = results[0][0];
  return data;
}

async function hostessDashboardEmail(uuid) {
  const conn = await mysql.createConnection(mysqlServer);

  try {
    if (!uuid) {
      return { error: "reservation not found" };
    }

    const attendee = await getAttendee(conn, uuid);

    const eventDateFormatted = format(attendee.eventDate, "eeee MMMM do");

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee.email,
      from: "refuge@thewaterschurch.net",
      cc: "refuge@thewaterschurch.net",
      bcc: "jmorris@sterling-databases.com",
      subject: "Refuge Ball Hostess Dashboard",
      templateId: "d-a0a09590c7394419b4befb801eb784eb",
      dynamicTemplateData: {
        name: attendee.name,
        date: eventDateFormatted,
        dashboardUrl: `https://refugeball.com/hostess/${attendee.uuid}`,
      },
    };
    await sgMail
      .send(msg)
      .then(async (foo) => {
        console.log("Email sent");

        const sqlUpdate = `UPDATE eventAttendees SET hostess_dashboard_email_sent=1 WHERE uuid=?;`;
        const [resultsUpdate] = await conn.query(sqlUpdate, [uuid]);
      })
      .catch((error) => {
        console.error(error);
        return { error };
      });

    return { success: "good to go" };
  } catch (err) {
    console.error(err);
    return { error: err };
  } finally {
    conn.end();
  }
}
async function hostessDashboardSms(uuid) {
  if (!uuid) {
    return { error: "uuid is required" };
  }
  const conn = await mysql.createConnection(mysqlServer);

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require("twilio")(accountSid, authToken);

    const attendee = await getAttendee(conn, uuid);
    const eventDateFormatted = format(attendee.eventDate, "eeee MMMM do");

    const body = `Refuge Ball 2024 
Date:  ${eventDateFormatted}

Here is a link to your personal hostess dashboard
Don't share it!

https://refugeball.com/hostess/${attendee.uuid}
`;

    const foo = await client.messages
      .create({
        body: body,
        from: "+13203453479",
        to: attendee.phone,
      })
      .then(async (message) => {
        console.log("text sent");

        const sqlUpdate = `UPDATE eventAttendees SET hostess_dashboard_text_sent=1 WHERE uuid=?;`;
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

async function sendEmails() {
  const uuidArray = ["9f177af8-f1eb-4dc9-b8de-32e6926cc40a"];

  for (const uuid of uuidArray) {
    await hostessDashboardEmail(uuid);
  }
}

async function sendSmss() {
  const uuidArray = ["9f177af8-f1eb-4dc9-b8de-32e6926cc40a"];

  for (const uuid of uuidArray) {
    await hostessDashboardSms(uuid);
  }
}
sendEmails();
//sendSmss()

//
//hostessDashboardSms('0930dd39-d2d1-4bc4-8b54-1dbaf6ba6e83')

//module.exports = router;
