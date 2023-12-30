const mysql = require('mysql2/promise');
const format = require('date-fns/format');
const path = require('path');
const { mysqlServer } = require('../connection');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');


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
      return { error: 'reservation not found' };
    }

    const attendee = await getAttendee(conn, uuid);

    const eventDateFormatted = format(attendee.eventDate, 'eeee MMMM do');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: attendee.email,
      from: 'refuge@thewaterschurch.net',
      subject: 'Refuge Ball Hostess Dashboard',
      templateId: 'd-a0a09590c7394419b4befb801eb784eb',
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

        const sqlUpdate = `UPDATE eventAttendees SET hostess_dashboard_email_sent=1 WHERE uuid=?;`;
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
async function hostessDashboardSms(uuid) {
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

    const body = `Refuge Ball 2024 
Date:  ${eventDateFormatted}

Here is a link to your personal hostess dashboard
Don't share it!

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

async function sendEmails(){

  const uuidArray=['15a2bdc9-642a-4f51-b7ec-d506414dc049',
  '524f6f8d-005e-45ad-8f11-e43a8fa93e6c',
  'ee32806e-ff1f-4c10-9d50-4e07c59e7412',
  'cd9f097d-f10f-422d-86e2-55110371b3cb',
  '9f9f5093-d33d-4d0d-8289-56b102c14c02',
  'f1552e18-45f4-4b30-8e01-b1fa245b3ffe',
  'af0f7c9b-c76a-4d9d-9c1e-31f8fbb77d4e',
  '306443cb-ba7f-49c8-8106-54eb1693d010',
  'c127d99f-093f-46e8-a074-70404e9b9a0b',
  '2484f942-3b5a-4513-8e4f-579e4cd98b3a',
  'b1cb7970-fb9c-4b10-b655-8da918f4da65',
  '6c34a294-4056-46a0-9a28-4fc41c077e31',
  '7a551e2f-dbb0-4576-9463-d8f4a0b7abe1',
  '4c644a24-093b-434d-9502-826c3b2a3a7d',
  'fad855eb-4f02-4760-9326-8163d90bf796',
  '30821c15-1b87-401c-ab12-0698a3bd4171',
  'b1e2c85f-6104-44b5-b0b5-5ecd56c38cf6',
  '94f68c27-8b99-42e0-bcf0-9d7651a36dcd',
  '83c2d3fb-6bdf-44ae-bd73-454e531fc3ee',
  '7e8b0588-d2fe-4139-84d3-3945c2a149e8',
  '63aad9f1-ccfb-4e7b-8b26-142e8494d7b5',
  '7699ac3e-da38-4044-84a2-ef4a30d9c3a1',
  'd7b91943-6a42-4247-9c49-e6036799686e',
  '392a5c16-6e1d-4008-b6d1-115e8e9750cb',
  '050c0990-53da-4e61-9558-c1de0469c314',
  '52bfebd4-17c9-4077-b39e-54abbc0687d4',
  '16edea30-403c-4a80-8e79-fdb4ce23ad49',
  '0da40503-cf6e-4911-9a4a-15614903befe',
  'fdf2ac79-8b1e-4da2-80c4-6f8cba4ccd77',
  '18a214fb-711d-42de-945c-13fb5b26fc36',
  '20baa1b8-54ff-4529-a2d6-04b73fc60c21',
  '09796e2b-89fd-4507-993e-6c83b8a30b15',
  '65ea8bce-ef30-422e-b214-d251cdfcf490',
  '32737c37-b7f3-436e-9000-1d512392fe1d',
  '9eed723c-0296-43d6-876b-352148df8d94',
  '0d38108d-b57a-45f5-acb6-bb01fb9d9377',
  '3e237457-f90b-4578-9fcf-1ecba89460d9',
  '69738591-8e12-4e8c-a110-4ba40519ea17',
  '22bd540c-af5e-4e5c-9f92-e578e5d803a7',
  'c97dd9ed-1d9b-4c46-ad03-4015ab8e819f',
  '3aabfc5c-832c-4534-9491-c7148adc7fdd',
  '0fa559f1-b8e6-4e79-9413-94d27d543d7b',
  'a916e169-0ea8-40c6-b92b-6abd706d6935',
  'c2740ea8-c7a0-4158-ad2e-ab9441911d67',
  'faf5dde4-23a8-4e63-9846-72cc09dced2d',
  '88c95cb6-3ed1-4333-8bda-5f848d2c8e5e',
  '1a261e78-9a51-4207-ae79-bad04284692c',
  'e1d76320-4e6c-4d56-9845-6d910478879c',
  '7337b13d-63cb-48da-8321-5dda44e305f0',
  '1734e89a-b25a-4b5c-88d5-e553be76bee1',
  'd0f69951-5791-4d84-843e-cbc51b1a3437',
  'aa2799b8-7b93-464e-b7fc-01af3d9ae123',
  '5c845c7e-e735-4350-a44e-6f809a3c6a3f',
  '820f1402-bf09-4a20-97d1-aa1e55adc661',
  '03d04c19-204b-484f-98a0-ef886a08241b',
  'c2c92137-c12e-45cf-96cf-ebc045328403',
  '9f177af8-f1eb-4dc9-b8de-32e6926cc40a',
  '45628db4-89e7-4d63-aa9d-9f4096ea33ab',
  'd45ce753-7dca-4789-97c9-e067ceab7d1e',
  'a4c2c8ed-59c1-4966-887d-7db0051b6aae',
  '06d45fc7-7221-4040-b588-e4cb9874c1b4',
  '724ef4d4-34fe-49c9-82af-8d2f5de62ce5',
  '655ce64b-1c4e-421a-853f-f36dac260a30',
  'c9e74401-38c4-4cfc-9111-5f4728507975',
  '7342a397-7736-4636-acbe-48d7b3b3f867',
  '823cac86-ac61-4186-a7c7-8501fb50eeda',
  '0930dd39-d2d1-4bc4-8b54-1dbaf6ba6e83',
  '8b481ca5-dc69-4e17-9197-cb90c5fc85a7',
  '8a729e89-baa0-4e95-95d6-4627cf640337',
  '32f21ac5-4158-47c5-985d-a9c31cb4db58',
  '030ed7d1-1b2c-4b5c-959e-e1c091f29b2f']


  for (const uuid of uuidArray) {
    await hostessDashboardEmail(uuid);
  }


}

async function sendSmss(){

  const uuidArray=['15a2bdc9-642a-4f51-b7ec-d506414dc049',
  '524f6f8d-005e-45ad-8f11-e43a8fa93e6c',
  'ee32806e-ff1f-4c10-9d50-4e07c59e7412',
  'cd9f097d-f10f-422d-86e2-55110371b3cb',
  '9f9f5093-d33d-4d0d-8289-56b102c14c02',
  'f1552e18-45f4-4b30-8e01-b1fa245b3ffe',
  'af0f7c9b-c76a-4d9d-9c1e-31f8fbb77d4e',
  '306443cb-ba7f-49c8-8106-54eb1693d010',
  'c127d99f-093f-46e8-a074-70404e9b9a0b',
  '2484f942-3b5a-4513-8e4f-579e4cd98b3a',
  'b1cb7970-fb9c-4b10-b655-8da918f4da65',
  '6c34a294-4056-46a0-9a28-4fc41c077e31',
  '7a551e2f-dbb0-4576-9463-d8f4a0b7abe1',
  '4c644a24-093b-434d-9502-826c3b2a3a7d',
  'fad855eb-4f02-4760-9326-8163d90bf796',
  '30821c15-1b87-401c-ab12-0698a3bd4171',
  'b1e2c85f-6104-44b5-b0b5-5ecd56c38cf6',
  '94f68c27-8b99-42e0-bcf0-9d7651a36dcd',
  '83c2d3fb-6bdf-44ae-bd73-454e531fc3ee',
  '7e8b0588-d2fe-4139-84d3-3945c2a149e8',
  '63aad9f1-ccfb-4e7b-8b26-142e8494d7b5',
  '7699ac3e-da38-4044-84a2-ef4a30d9c3a1',
  'd7b91943-6a42-4247-9c49-e6036799686e',
  '392a5c16-6e1d-4008-b6d1-115e8e9750cb',
  '050c0990-53da-4e61-9558-c1de0469c314',
  '52bfebd4-17c9-4077-b39e-54abbc0687d4',
  '16edea30-403c-4a80-8e79-fdb4ce23ad49',
  '0da40503-cf6e-4911-9a4a-15614903befe',
  'fdf2ac79-8b1e-4da2-80c4-6f8cba4ccd77',
  '18a214fb-711d-42de-945c-13fb5b26fc36',
  '20baa1b8-54ff-4529-a2d6-04b73fc60c21',
  '09796e2b-89fd-4507-993e-6c83b8a30b15',
  '65ea8bce-ef30-422e-b214-d251cdfcf490',
  '32737c37-b7f3-436e-9000-1d512392fe1d',
  '9eed723c-0296-43d6-876b-352148df8d94',
  '0d38108d-b57a-45f5-acb6-bb01fb9d9377',
  '3e237457-f90b-4578-9fcf-1ecba89460d9',
  '69738591-8e12-4e8c-a110-4ba40519ea17',
  '22bd540c-af5e-4e5c-9f92-e578e5d803a7',
  'c97dd9ed-1d9b-4c46-ad03-4015ab8e819f',
  '3aabfc5c-832c-4534-9491-c7148adc7fdd',
  '0fa559f1-b8e6-4e79-9413-94d27d543d7b',
  'a916e169-0ea8-40c6-b92b-6abd706d6935',
  'c2740ea8-c7a0-4158-ad2e-ab9441911d67',
  'faf5dde4-23a8-4e63-9846-72cc09dced2d',
  '88c95cb6-3ed1-4333-8bda-5f848d2c8e5e',
  '1a261e78-9a51-4207-ae79-bad04284692c',
  'e1d76320-4e6c-4d56-9845-6d910478879c',
  '7337b13d-63cb-48da-8321-5dda44e305f0',
  '1734e89a-b25a-4b5c-88d5-e553be76bee1',
  'd0f69951-5791-4d84-843e-cbc51b1a3437',
  'aa2799b8-7b93-464e-b7fc-01af3d9ae123',
  '5c845c7e-e735-4350-a44e-6f809a3c6a3f',
  '820f1402-bf09-4a20-97d1-aa1e55adc661',
  '03d04c19-204b-484f-98a0-ef886a08241b',
  'c2c92137-c12e-45cf-96cf-ebc045328403',
  '9f177af8-f1eb-4dc9-b8de-32e6926cc40a',
  '45628db4-89e7-4d63-aa9d-9f4096ea33ab',
  'd45ce753-7dca-4789-97c9-e067ceab7d1e',
  'a4c2c8ed-59c1-4966-887d-7db0051b6aae',
  '06d45fc7-7221-4040-b588-e4cb9874c1b4',
  '724ef4d4-34fe-49c9-82af-8d2f5de62ce5',
  '655ce64b-1c4e-421a-853f-f36dac260a30',
  'c9e74401-38c4-4cfc-9111-5f4728507975',
  '7342a397-7736-4636-acbe-48d7b3b3f867',
  '823cac86-ac61-4186-a7c7-8501fb50eeda',
  '0930dd39-d2d1-4bc4-8b54-1dbaf6ba6e83',
  '8b481ca5-dc69-4e17-9197-cb90c5fc85a7',
  '8a729e89-baa0-4e95-95d6-4627cf640337',
  '32f21ac5-4158-47c5-985d-a9c31cb4db58',
  '030ed7d1-1b2c-4b5c-959e-e1c091f29b2f']


  for (const uuid of uuidArray) {
    await hostessDashboardSms(uuid);
  }


}
//sendEmails()
//sendSmss()

//
//hostessDashboardSms('0930dd39-d2d1-4bc4-8b54-1dbaf6ba6e83')

//module.exports = router;
