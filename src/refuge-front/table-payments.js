const { lockAttendees, unlockAttendees } = require("./payment-guards");
const {
  fail,
  selectionsFrom,
  quoteFor,
  paymentRequest,
} = require("./table-payment-rules");

// Uses the private hostess dashboard UUID, matching the existing dashboard access model.
module.exports = function registerTablePayments(
  router,
  { connect, client, locationId, applicationId, production }
) {
  async function loadQuote(conn, hostessUuid, selections) {
    const [[hostess]] = await conn.query(
      "SELECT *, DATE_FORMAT(eventDate, '%Y-%m-%d') AS eventDate FROM eventAttendees WHERE uuid=? AND deleted IS NULL FOR UPDATE",
      [hostessUuid]
    );
    const [attendees] = await conn.query(
      "SELECT *, DATE_FORMAT(eventDate, '%Y-%m-%d') AS eventDate FROM eventAttendees WHERE uuid IN (?) ORDER BY uuid FOR UPDATE",
      [selections.map((s) => s.uuid)]
    );
    const [[costs]] = await conn.query("SELECT * FROM eventCosts WHERE id=1");
    return {
      hostess,
      quote: quoteFor(hostess, attendees, selections, costs || {}),
    };
  }

  function checkoutResponse(row) {
    return {
      checkoutId: row.id,
      status: row.status,
      total: row.total,
      items: JSON.parse(row.selectionsJson),
      receiptUrl: row.receiptUrl,
    };
  }

  function route(handler) {
    return async (req, res) => {
      let conn;
      try {
        conn = await connect();
        await handler(req, res, conn);
      } catch (error) {
        if (conn) await conn.rollback().catch(() => {});
        const missingSchema = error.code === "ER_NO_SUCH_TABLE";
        res
          .status(error.status || 503)
          .json({
            error: missingSchema
              ? "Table payments are not configured yet. Please contact the event organizer."
              : error.status
              ? error.message
              : "Payment status could not be confirmed. Retry this checkout to safely check again.",
          });
      } finally {
        if (conn) await conn.end();
      }
    };
  }

  router.post(
    "/tablePaymentQuote",
    route(async (req, res, conn) => {
      const selections = selectionsFrom(req.body.selections);
      await conn.beginTransaction();
      const { quote } = await loadQuote(conn, req.body.hostessUuid, selections);
      const [claims] = await conn.query(
        "SELECT attendeeUuid FROM paymentClaims WHERE attendeeUuid IN (?)",
        [selections.map((s) => s.uuid)]
      );
      if (claims.length)
        fail(
          "A payment is already pending for a selected guest. Resume the pending payment first.",
          409
        );
      await conn.commit();
      res.json(quote);
    })
  );

  router.post(
    "/tablePaymentStatus",
    route(async (req, res, conn) => {
      const [[hostess]] = await conn.query(
        "SELECT isHostess FROM eventAttendees WHERE uuid=? AND deleted IS NULL",
        [req.body.hostessUuid]
      );
      if (!hostess || !hostess.isHostess) fail("Hostess not found.", 403);
      const [rows] = await conn.query(
        "SELECT * FROM paymentCheckouts WHERE hostessUuid=? AND status='PENDING' ORDER BY created LIMIT 1",
        [req.body.hostessUuid]
      );
      res.json({
        pending: rows[0] ? checkoutResponse(rows[0]) : null,
        square: { applicationId, locationId, production },
      });
    })
  );

  router.post(
    "/payTable",
    route(async (req, res, conn) => {
      const { hostessUuid, checkoutId, sourceId, expectedTotal } = req.body;
      if (
        typeof hostessUuid !== "string" ||
        typeof checkoutId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(checkoutId)
      )
        fail("Invalid checkout.");
      // Serialize retries of this checkout across processes, including after a lost response.
      const lock = `table-pay:${checkoutId}`;
      const [[locked]] = await conn.query("SELECT GET_LOCK(?, 0) AS acquired", [
        lock,
      ]);
      if (!locked.acquired)
        fail("This payment is still processing. Please retry shortly.", 409);
      let attendeeLocks = [];
      try {
        let [[checkout]] = await conn.query(
          "SELECT * FROM paymentCheckouts WHERE id=?",
          [checkoutId]
        );
        if (checkout && checkout.hostessUuid !== hostessUuid)
          fail("Checkout not found.", 403);
        if (checkout && checkout.status !== "PENDING") {
          return res.json(checkoutResponse(checkout));
        }
        if (!checkout) {
          if (!locationId) fail("Payment configuration is unavailable.", 503);
          const selections = selectionsFrom(req.body.selections);
          if (
            typeof sourceId !== "string" ||
            !sourceId ||
            sourceId.length > 1024
          )
            fail("Payment details are required.");
          attendeeLocks = await lockAttendees(conn, [
            hostessUuid,
            ...selections.map((s) => s.uuid),
          ]);
          await conn.beginTransaction();
          const { hostess, quote } = await loadQuote(
            conn,
            hostessUuid,
            selections
          );
          if (expectedTotal !== quote.total)
            fail(
              "Prices changed. Close and reopen checkout to review the new total.",
              409
            );
          const [claims] = await conn.query(
            "SELECT attendeeUuid FROM paymentClaims WHERE attendeeUuid IN (?)",
            [selections.map((s) => s.uuid)]
          );
          if (claims.length)
            fail("A selected guest already has a pending payment.", 409);
          const request = paymentRequest(quote, sourceId, hostess, locationId);
          await conn.query(
            "INSERT INTO paymentCheckouts (id, hostessUuid, requestJson, selectionsJson, total) VALUES (?, ?, ?, ?, ?)",
            [
              checkoutId,
              hostessUuid,
              JSON.stringify(request),
              JSON.stringify(quote.items),
              quote.total,
            ]
          );
          for (const item of quote.items) {
            await conn.query(
              "INSERT INTO paymentClaims (attendeeUuid, checkoutId) VALUES (?, ?)",
              [item.uuid, checkoutId]
            );
          }
          // Durable request + attendee claims precede the external charge. Never release claims on an ambiguous failure.
          await conn.commit();
          [[checkout]] = await conn.query(
            "SELECT * FROM paymentCheckouts WHERE id=?",
            [checkoutId]
          );
        }
        const request = JSON.parse(checkout.requestJson);
        let payment;
        try {
          const result = checkout.paymentId
            ? await client.paymentsApi.getPayment(checkout.paymentId)
            : await client.paymentsApi.createPayment(request);
          payment = result.result.payment;
        } catch (error) {
          // Only a definitive card decline permits starting a new checkout. All other errors retain the same request/key.
          const declined =
            error.errors?.some((e) => e.category === "PAYMENT_METHOD_ERROR") &&
            error.statusCode >= 400 &&
            error.statusCode < 500;
          if (!declined) throw error;
          await conn.beginTransaction();
          await conn.query(
            "UPDATE paymentCheckouts SET status='FAILED', requestJson='{}' WHERE id=?",
            [checkoutId]
          );
          await conn.query(
            "DELETE FROM paymentClaims WHERE checkoutId=?",
            [checkoutId]
          );
          await conn.commit();
          return res.json({
            checkoutId,
            status: "FAILED",
            error: "Your card was declined. Please try another card.",
          });
        }
        if (payment?.id) {
          await conn.query(
            "UPDATE paymentCheckouts SET paymentId=? WHERE id=?",
            [payment.id, checkoutId]
          );
        }
        if (payment?.status !== "COMPLETED") {
          // An approved/pending payment is not a paid registration.
          if (["FAILED", "CANCELED"].includes(payment?.status)) {
            await conn.beginTransaction();
            await conn.query(
              "UPDATE paymentCheckouts SET status='FAILED', requestJson='{}' WHERE id=?",
              [checkoutId]
            );
            await conn.query(
              "DELETE FROM paymentClaims WHERE checkoutId=?",
              [checkoutId]
            );
            await conn.commit();
            return res.json({
              checkoutId,
              status: "FAILED",
              error: "Payment was not completed. Please try another card.",
            });
          }
          return res.status(202).json({ checkoutId, status: "PENDING" });
        }
        if (
          Number(payment.amountMoney?.amount) !== checkout.total ||
          payment.amountMoney?.currency !== "USD"
        ) {
          fail(
            "Payment requires review by the event organizer. Do not start another payment.",
            409
          );
        }
        const items = JSON.parse(checkout.selectionsJson);
        await conn.beginTransaction();
        for (const item of items) {
          // One allocated payment row per guest preserves existing attendee/receipt joins without multiplying the charged amount.
          await conn.query(
            `INSERT INTO eventPayments
          (created, uuid, payment, paymentId, orderId, receiptUrl, status, cardBrand, last4, amount)
          VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.uuid,
              JSON.stringify(payment),
              payment.id,
              payment.orderId || null,
              payment.receiptUrl || null,
              payment.status,
              payment.cardDetails?.card?.cardBrand || null,
              payment.cardDetails?.card?.last4 || null,
              item.amount,
            ]
          );
          await conn.query(
            "UPDATE eventAttendees SET hasPaid=1, specialDinner=?, specialDinnerType=?, modified=NOW() WHERE uuid=?",
            [
              item.specialDinner ? 1 : 0,
              item.specialDinner ? "Gluten/Dairy free" : "",
              item.uuid,
            ]
          );
        }
        await conn.query(
          "UPDATE paymentCheckouts SET status='COMPLETED', paymentId=?, receiptUrl=?, requestJson='{}' WHERE id=?",
          [payment.id, payment.receiptUrl || null, checkoutId]
        );
        await conn.query("DELETE FROM paymentClaims WHERE checkoutId=?", [
          checkoutId,
        ]);
        await conn.commit();
        res.json({
          checkoutId,
          status: "COMPLETED",
          receiptUrl: payment.receiptUrl,
          total: checkout.total,
          items,
        });
      } finally {
        await unlockAttendees(conn, attendeeLocks);
        await conn.query("SELECT RELEASE_LOCK(?)", [lock]);
      }
    })
  );
};
