const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  selectionsFrom,
  quoteFor,
} = require("../src/refuge-front/table-payment-rules");
const hostess = {
  uuid: "hostess",
  isHostess: 1,
  eventDate: "2026-02-10",
  tableNumber: 1,
};
const guest = {
  uuid: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  wasInvited: 1,
  hasPaid: 0,
  eventDate: hostess.eventDate,
  tableNumber: 1,
  name: "Guest",
};
const selection = { uuid: guest.uuid, specialDinner: true };
const costs = { general: 40, specialDinner: 5 };

test("prices are calculated in cents from server costs, ignoring supplied prices", () => {
  const selections = selectionsFrom([{ ...selection, amount: 1 }]);
  assert.equal(quoteFor(hostess, [guest], selections, costs).total, 4500);
  assert.equal(
    quoteFor(hostess, [guest], [{ ...selection, specialDinner: false }], costs)
      .total,
    4000
  );
});
test("empty, duplicate, and malformed selections are rejected", () => {
  for (const input of [
    [],
    [selection, selection],
    [{ ...selection, specialDinner: "yes" }],
    [{ uuid: "bad", specialDinner: false }],
  ]) {
    assert.throws(() => selectionsFrom(input));
  }
});
test("only unpaid invited guests at this hostess's table are payable", () => {
  for (const changes of [
    { hasPaid: 1 },
    { isHostess: 1 },
    { wasInvited: 0 },
    { deleted: "today" },
    { tableNumber: 2 },
    { eventDate: "2026-02-11" },
  ]) {
    assert.throws(
      () => quoteFor(hostess, [{ ...guest, ...changes }], [selection], costs),
      { status: 409 }
    );
  }
  assert.throws(() => quoteFor(hostess, [], [selection], costs), {
    status: 409,
  });
  assert.throws(
    () => quoteFor({ ...hostess, isHostess: 0 }, [guest], [selection], costs),
    { status: 403 }
  );
});
test("invalid prices never reach a charge", () => {
  for (const general of [undefined, -10, "oops", 0])
    assert.throws(() =>
      quoteFor(hostess, [guest], [selection], { general, specialDinner: 5 })
    );
});
