const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { paymentGuard } = require("../src/refuge-front/payment-guards");

async function run(paymentRoute, { pending = false, paid = false, missingSchema = false } = {}) {
  let nextCalled = false;
  let ended = false;
  const conn = {
    async query(sql) {
      if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
      if (sql.includes("RELEASE_LOCK")) return [[{}]];
      if (sql.includes("masterAttendeeUuid")) return [[{ uuid: "guest" }]];
      if (sql.includes("paymentClaims")) {
        if (missingSchema) throw { code: "ER_NO_SUCH_TABLE" };
        return [pending ? [{ attendeeUuid: "guest" }] : []];
      }
      if (sql.includes("hasPaid=1")) return [paid ? [{ uuid: "guest" }] : []];
      throw new Error(sql);
    },
    async end() { ended = true; },
  };
  const res = Object.assign(new EventEmitter(), {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    end() { this.emit("finish"); return this; },
  });
  await paymentGuard(async () => conn)({ paymentRoute, body: { uuid: "guest", attendee: { uuid: "guest" }, registrationData: { uuid: "guest" }, groupData: [{ uuid: "guest" }] } }, res, () => { nextCalled = true; res.end(); });
  await new Promise((resolve) => setImmediate(resolve));
  return { res, nextCalled, ended };
}
test("pending table payments block all conflicting existing mutation paths", async () => {
  for (const route of ["payment", "reserveInvitee", "reserveGeneral", "removeAttendee", "transferAttendee", "cancel", "updateGroupReservation"]) {
    const result = await run(route, { pending: true });
    assert.equal(result.res.code, 409, route);
    assert.equal(result.nextCalled, false, route);
    assert.equal(result.ended, true, route);
  }
});
test("paid invitees cannot pay again or reset their paid state through registration", async () => {
  for (const route of ["payment", "reserveInvitee", "reserveGeneral", "cancel"]) {
    const result = await run(route, { paid: true });
    assert.equal(result.res.code, 409);
    assert.equal(result.nextCalled, false);
  }
});
test("normal edits and pre-migration requests release their lock connection", async () => {
  for (const options of [{}, { paid: true }, { missingSchema: true }]) {
    const result = await run("transferAttendee", options);
    assert.equal(result.nextCalled, true);
    assert.equal(result.ended, true);
  }
});
