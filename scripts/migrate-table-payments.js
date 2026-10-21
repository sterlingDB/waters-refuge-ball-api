// Explicitly run against the database configured in .env; never called during startup.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { mysqlServer } = require("../src/connection");
(async () => {
  const conn = await mysql.createConnection(mysqlServer);
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "../migrations/001_table_payments.sql"),
      "utf8"
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await conn.query(statement);
    }
    console.log("Table payment tables are ready.");
  } finally {
    await conn.end();
  }
})().catch(() => {
  console.error(
    "Table payment migration failed. Check database access and schema permissions."
  );
  process.exitCode = 1;
});
