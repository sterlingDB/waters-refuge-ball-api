const { test } = require("node:test");
const assert = require("node:assert/strict");
const register = require("../src/refuge-front/table-payments");
const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const checkoutId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
function setup() {
  let state = { checkout: null, claims: [], payments: [], paid: false };
  let snapshot;
  let failPersistence = false;
  let mode = "COMPLETED";
  const requests = [];
  const squarePayments = new Map();
  const conn = {
    async beginTransaction() {
      snapshot = structuredClone(state);
    },
    async commit() {
      snapshot = undefined;
    },
    async rollback() {
      if (snapshot) state = snapshot;
      snapshot = undefined;
    },
    async end() {},
    async query(sql, args = []) {
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{}]];
      if (sql.startsWith("SELECT * FROM paymentCheckouts WHERE id"))
        return [[state.checkout].filter(Boolean)];
      if (sql.includes("FROM eventAttendees WHERE uuid=?"))
        return [
          [
            {
              uuid: "host",
              isHostess: 1,
              eventDate: "2026-02-10",
              tableNumber: 1,
            },
          ],
        ];
      if (sql.includes("FROM eventAttendees WHERE uuid IN"))
        return [
          [
            {
              uuid: id,
              name: "Guest",
              wasInvited: 1,
              hasPaid: state.paid,
              eventDate: "2026-02-10",
              tableNumber: 1,
            },
          ],
        ];
      if (sql.includes("FROM eventCosts"))
        return [[{ general: 40, specialDinner: 5 }]];
      if (sql.startsWith("SELECT attendeeUuid FROM paymentClaims"))
        return [state.claims.map((attendeeUuid) => ({ attendeeUuid }))];
      if (sql.startsWith("INSERT INTO paymentCheckouts")) {
        state.checkout = {
          id: args[0],
          hostessUuid: args[1],
          requestJson: args[2],
          selectionsJson: args[3],
          total: args[4],
          status: "PENDING",
        };
      } else if (sql.startsWith("INSERT INTO paymentClaims"))
        state.claims.push(args[0]);
      else if (sql.startsWith("UPDATE paymentCheckouts SET paymentId"))
        state.checkout.paymentId = args[0];
      else if (sql.startsWith("INSERT INTO eventPayments")) {
        if (failPersistence) {
          failPersistence = false;
          throw new Error("Database disconnected after charge");
        }
        state.payments.push(args);
      } else if (sql.startsWith("UPDATE eventAttendees")) state.paid = true;
      else if (
        sql.startsWith("UPDATE paymentCheckouts SET status='COMPLETED'")
      )
        Object.assign(state.checkout, {
          status: "COMPLETED",
          requestJson: "{}",
          paymentId: args[0],
        });
      else if (
        sql.startsWith("UPDATE paymentCheckouts SET status='FAILED'")
      )
        Object.assign(state.checkout, { status: "FAILED", requestJson: "{}" });
      else if (sql.startsWith("DELETE FROM paymentClaims"))
        state.claims = [];
      else throw new Error(`Unexpected SQL: ${sql}`);
      return [{}];
    },
  };
  const handlers = {};
  const client = {
    paymentsApi: {
      async createPayment(request) {
        requests.push(structuredClone(request));
        if (mode === "DECLINED")
          throw {
            statusCode: 400,
            errors: [{ category: "PAYMENT_METHOD_ERROR" }],
          };
        if (mode === "NETWORK") throw new Error("Network timeout");
        const payment = {
          id: "square-id",
          status: mode,
          amountMoney: { amount: request.amountMoney.amount, currency: "USD" },
        };
        squarePayments.set(payment.id, payment);
        return { result: { payment } };
      },
      async getPayment(paymentId) {
        return { result: { payment: squarePayments.get(paymentId) } };
      },
    },
  };
  register(
    {
      post(path, handler) {
        handlers[path] = handler;
      },
    },
    { connect: async () => conn, client, locationId: "location" }
  );
  const body = {
    hostessUuid: "host",
    checkoutId,
    sourceId: "test-token",
    expectedTotal: 4500,
    selections: [{ uuid: id, specialDinner: true }],
  };
  async function pay(data = body) {
    const response = {
      code: 200,
      status(code) {
        this.code = code;
        return this;
      },
      json(value) {
        this.body = value;
        return this;
      },
    };
    await handlers["/payTable"]({ body: data }, response);
    return response;
  }
  return {
    pay,
    body,
    requests,
    state: () => state,
    setMode(value) {
      mode = value;
    },
    failPersistence() {
      failPersistence = true;
    },
  };
}

test("successful batch marks guests paid and repeat submission does not charge or persist twice", async () => {
  const h = setup();
  assert.equal((await h.pay()).body.status, "COMPLETED");
  assert.equal((await h.pay()).body.status, "COMPLETED");
  assert.equal(h.requests.length, 1);
  assert.equal(h.state().payments.length, 1);
  assert.equal(h.state().payments[0].at(-1), 4500);
  assert.equal(h.state().paid, true);
  assert.equal(h.state().checkout.requestJson, "{}");
  assert.deepEqual(h.state().claims, []);
});
test("a database failure after a successful charge retains claims and recovers without another charge", async () => {
  const h = setup();
  h.failPersistence();
  assert.equal((await h.pay()).code, 503);
  assert.equal(h.state().paid, false);
  assert.equal(h.state().claims.length, 1);
  assert.equal(
    (await h.pay({ hostessUuid: "host", checkoutId })).body.status,
    "COMPLETED"
  );
  assert.equal(h.requests.length, 1);
  assert.equal(h.state().payments.length, 1);
});
test("ambiguous network errors retry the exact persisted Square request and key", async () => {
  const h = setup();
  h.setMode("NETWORK");
  assert.equal((await h.pay()).code, 503);
  h.setMode("COMPLETED");
  assert.equal(
    (await h.pay({ hostessUuid: "host", checkoutId })).body.status,
    "COMPLETED"
  );
  assert.deepEqual(h.requests[0], h.requests[1]);
});
test("declines release claims without marking attendees paid", async () => {
  const h = setup();
  h.setMode("DECLINED");
  assert.equal((await h.pay()).body.status, "FAILED");
  assert.equal(h.state().paid, false);
  assert.equal(h.state().payments.length, 0);
  assert.equal(h.state().claims.length, 0);
});
test("pending Square payments do not mark registrations paid", async () => {
  const h = setup();
  h.setMode("APPROVED");
  assert.equal((await h.pay()).code, 202);
  assert.equal(h.state().paid, false);
  assert.equal(h.state().claims.length, 1);
});
test("another hostess cannot resume a checkout and changed prices cannot be charged", async () => {
  const h = setup();
  assert.equal((await h.pay({ ...h.body, expectedTotal: 1 })).code, 409);
  assert.equal(h.requests.length, 0);
  await h.pay();
  assert.equal(
    (await h.pay({ hostessUuid: "another-host", checkoutId })).code,
    403
  );
  assert.equal(h.requests.length, 1);
});
