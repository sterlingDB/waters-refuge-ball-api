const { fail } = require("./table-payment-rules");

async function lockAttendees(conn, uuids) {
  const locks = [];
  try {
    for (const uuid of [...new Set(uuids)].sort()) {
      const lock = `attendee:${uuid}`;
      const [[result]] = await conn.query("SELECT GET_LOCK(?, 5) AS acquired", [
        lock,
      ]);
      if (!result.acquired)
        fail("A guest is being updated. Please try again.", 409);
      locks.push(lock);
    }
  } catch (error) {
    await unlockAttendees(conn, locks);
    throw error;
  }
  return locks;
}
async function unlockAttendees(conn, locks) {
  for (const lock of locks) await conn.query("SELECT RELEASE_LOCK(?)", [lock]);
}

// Existing mutation/payment routes use their own connections. Advisory locks span those
// connections while durable checkout claims protect guests after an interrupted charge.
function paymentGuard(connect) {
  return async (req, res, next) => {
    const routePath = `/${req.paymentRoute}`;
    let conn;
    let locks = [];
    let released = false;
    async function release() {
      if (released) return;
      released = true;
      if (conn) {
        try {
          await unlockAttendees(conn, locks);
        } finally {
          await conn.end();
        }
      }
    }
    try {
      let uuids = [req.body.uuid || req.body.attendee?.uuid];
      if (routePath === "/reserveGeneral")
        uuids = [
          req.body.registrationData?.uuid,
          req.body.registrationData2?.uuid,
          req.body.registrationData3?.uuid,
        ];
      if (routePath === "/updateGroupReservation")
        uuids = (req.body.groupData || []).map((a) => a.uuid);
      uuids = uuids.filter((id) => typeof id === "string" && id.length <= 64);
      if (!uuids.length) fail("An attendee is required.");
      conn = await connect();
      if (routePath === "/payment") {
        const [group] = await conn.query(
          "SELECT uuid FROM eventAttendees WHERE uuid=? OR masterAttendeeUuid=?",
          [uuids[0], uuids[0]]
        );
        uuids = [...new Set([...uuids, ...group.map((a) => a.uuid)])];
      }
      locks = await lockAttendees(conn, uuids);
      let claims;
      try {
        [claims] = await conn.query(
          "SELECT attendeeUuid FROM paymentClaims WHERE attendeeUuid IN (?)",
          [uuids]
        );
      } catch (error) {
        // Preserve pre-existing routes during rollout before the additive migration is applied.
        if (error.code !== "ER_NO_SUCH_TABLE") throw error;
        claims = [];
      }
      if (claims.length)
        fail(
          "Payment is pending for this guest. Resume it from the hostess dashboard before making changes.",
          409
        );
      if (
        ["/payment", "/reserveInvitee", "/reserveGeneral", "/cancel"].includes(
          routePath
        )
      ) {
        const [paid] = await conn.query(
          "SELECT uuid FROM eventAttendees WHERE uuid IN (?) AND hasPaid=1",
          [uuids]
        );
        if (paid.length)
          fail(
            "This registration has already been paid. Refresh to see its current status.",
            409
          );
      }
      res.once("finish", () => {
        release().catch(() => {});
      });
      const end = res.end;
      res.end = function (...args) {
        const result = end.apply(this, args);
        release().catch(() => {});
        return result;
      };
      // Do not release on close: a disconnected client may still have a charge in flight.
      // res.end above releases once the handler finishes even if its client disconnected.
      next();
    } catch (error) {
      await release();
      res
        .status(error.status || 503)
        .json({
          error: error.status
            ? error.message
            : "Unable to check payment status. Please try again.",
        });
    }
  };
}
module.exports = { lockAttendees, unlockAttendees, paymentGuard };
