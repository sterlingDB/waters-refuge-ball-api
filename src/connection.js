require("dotenv").config({ path: `${__dirname}/../.env` });

const mysqlServer = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "waters_refuge_ball",
};

module.exports = { mysqlServer };
