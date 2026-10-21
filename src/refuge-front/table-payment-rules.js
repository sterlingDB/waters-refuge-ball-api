const { randomUUID } = require("crypto");

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function selectionsFrom(input) {
  if (!Array.isArray(input) || !input.length || input.length > 8) {
    fail("Select between one and eight unpaid invitees.");
  }
  const seen = new Set();
  return input
    .map((item) => {
      if (
        !item ||
        typeof item.uuid !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(item.uuid) ||
        typeof item.specialDinner !== "boolean" ||
        seen.has(item.uuid)
      ) {
        fail("Invalid or duplicate attendee selection.");
      }
      seen.add(item.uuid);
      return { uuid: item.uuid, specialDinner: item.specialDinner };
    })
    .sort((a, b) => a.uuid.localeCompare(b.uuid));
}

function quoteFor(hostess, attendees, selections, costs) {
  if (!hostess || !hostess.isHostess || hostess.deleted || !hostess.eventDate || hostess.tableNumber == null)
    fail("Hostess not found.", 403);
  const general = Math.round(Number(costs.general) * 100);
  const specialDinner = Math.round(Number(costs.specialDinner) * 100);
  if (
    !Number.isSafeInteger(general) ||
    general <= 0 ||
    !Number.isSafeInteger(specialDinner) ||
    specialDinner < 0
  ) {
    fail("Ticket prices are unavailable.", 503);
  }
  const items = selections.map((selection) => {
    const attendee = attendees.find((a) => a.uuid === selection.uuid);
    if (
      !attendee ||
      attendee.deleted ||
      attendee.hasPaid ||
      attendee.isHostess ||
      !attendee.wasInvited ||
      attendee.eventDate !== hostess.eventDate ||
      attendee.tableNumber !== hostess.tableNumber
    ) {
      fail(
        "A selected guest is no longer an unpaid invitee at your table. Refresh the dashboard.",
        409
      );
    }
    return {
      ...selection,
      name: attendee.name,
      general,
      amount: general + (selection.specialDinner ? specialDinner : 0),
    };
  });
  return {
    items,
    general,
    specialDinner,
    total: items.reduce((sum, item) => sum + item.amount, 0),
  };
}

function paymentRequest(quote, sourceId, hostess, locationId) {
  return {
    sourceId,
    locationId,
    idempotencyKey: randomUUID(),
    amountMoney: { amount: quote.total, currency: "USD" },
    autocomplete: true,
    buyerEmailAddress: hostess.email || undefined,
    note: "Refuge Ball: hostess payment for invited guests",
  };
}

module.exports = { fail, selectionsFrom, quoteFor, paymentRequest };
