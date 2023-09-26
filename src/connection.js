require('dotenv').config({ path: `${__dirname}/../.env` });

let dbHost = 'data.dacis.com';
if (process.env.NODE_ENV === 'production') {
  dbHost = '127.0.0.1';
}
const mysqlServer = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'walkthroughchristmas',
};

module.exports = { mysqlServer };
