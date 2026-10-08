# Refuge Ball API — working notes

Initial repository review: 2026-10-08. These notes describe the checked-out code, not verified production infrastructure. Update them when behavior or setup changes.

## Relationship to the frontend

- This is the Node.js/Express backend for Refuge Ball registration, table hostess management, group registration, waitlisting, payments, and notifications.
- The sibling `../waters-refuge-ball` repository owns the Vue frontend. Read its `AGENTS.md` when making changes across the API boundary.
- Express mounts the API at `/api`, serves `src/refuge-front/dist`, and falls back to its `index.html` for client-side routes.
- The frontend builds to its own `dist/`. No automatic copy into this repository was found in the npm scripts. Treat updating the served bundle as a separate release step; edit frontend source in the sibling repository rather than generated assets here.

## Code map

- `src/index.js`: dotenv loading, body parsing, CORS, static hosting, HTTP/HTTPS, and production virtual hosts for `refugeball.com` and `www.refugeball.com`.
- `src/connection.js`: MySQL connection options from environment variables; database name is fixed to `waters_refuge_ball`.
- `src/refuge-front/routes.js`: main application implementation, approximately 1,938 lines at review. Contains SQL, registration and payment routes, pricing, seat allocation, cleanup, and SendGrid/Twilio helpers.
- `src/confirmations/`: standalone messaging scripts with top-level send calls. Running or importing them can send messages; they are not test utilities.
- `waters_refuge_ball.sql`: historical schema/data dump, not a migration system or a complete current schema.
- `packages/wtc/*` and `project.yml`: separate function-style implementation with Christmas reservation concepts; the hold function targets `walkthroughchristmas`. These are not mounted by the Express entry point. Verify external usage before changing or removing them.
- `ecosystem.config.js` and `update.sh`: PM2 production configuration and a server update script that pulls code, installs dependencies, and reloads the app.

## Local setup and commands

- Use npm and the existing `package-lock.json`. No Node version pin was found.
- `npm run dev`: development server through nodemon; inspector binds to `127.0.0.1:9230`.
- `SERVER_PORT` defaults to 80. A higher local port is possible, but the frontend's current development API URL must be updated to match.
- `npm start`: production mode; expects Linux Let's Encrypt certificate paths and production hostnames. It is not the local smoke-test command.
- `.env.fake` lists configuration names: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_PORT`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SENDGRID_API_KEY`, `SERVER_PORT`, `REFUGE_BALL_YEAR`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`.
- Keep actual credentials in local configuration. Do not copy `.env` values into documentation or logs. Use an isolated database and test service configuration for development.
- There are no root npm test, lint, or build scripts. Use `node --check <changed-file.js>` for syntax and targeted tests for behavior; syntax validation does not exercise the database or integrations.

## Domain and integration details

- Core tables include `eventAttendees`, `eventTables`, `eventDates`, `eventCosts`, `eventPayments`, `system_status`, and `eventWaitlist`.
- Attendee UUIDs identify individual registrations; `masterAttendeeUuid` ties group attendees together. Frontend payloads/types live in `../waters-refuge-ball/src/API.ts`.
- Registration routes include `/reserveHostess`, `/reserveGeneralHold`, `/reserveGeneralFetch`, `/reserveGeneral`, `/reserveInvitee`, and `/addToWaitlist`.
- Management routes handle invitations, transfers, removals, group updates, and hostess notes. UUID-bearing dashboard links should be treated as private access links.
- `/status` derives registration modes from database opening/closing dates and can return `closed`. Prices come from `eventCosts`; `calculateTotalPrice` returns dollar display amounts and cent charge amounts.
- Cleanup deletes eligible unpaid registrations older than 15 minutes. `/autoCleanup` invokes it; no scheduler was found in the reviewed entry point. Verify how production schedules it.
- Square uses production only when `NODE_ENV === "production"`; otherwise it uses sandbox. The frontend currently has separate hardcoded production Square configuration.
- SendGrid template IDs, sending identities, Twilio sender number, and public link origins are embedded in the routes. Year-dependent free/cash codes are also embedded there. Review these alongside `REFUGE_BALL_YEAR` for annual rollover.

## Existing issues and follow-up areas

- The SQL dump lacks current structures such as `eventWaitlist` and `eventAttendees.masterAttendeeUuid`. It also contains `DROP TABLE` statements. Do not use it as a current database migration; obtain/verify the current schema before schema work.
- No authentication middleware is attached to the reviewed routes; Passport/JWT imports in the entry point do not establish protection. Verify authorization requirements for attendee access, management, cleanup, and notification routes.
- Some GET endpoints send messages or delete data. Do not crawl or probe API routes under the assumption that GET is read-only.
- Seat selection and insertion in `/reserveGeneralHold` are separate queries without an explicit transaction. Review concurrent reservations and capacity enforcement before changing allocation.
- `/payment` generates a fresh idempotency key per request and separately persists payment/attendee state. Review retries and partial failures. Its non-Square-error branch references undefined `logger` and `attempt` variables.
- Connection cleanup and notification error handling vary by route. Preserve existing contracts while improving these deliberately.

## Validation baseline

On 2026-10-08, `node --check src/index.js` and `node --check src/refuge-front/routes.js` passed. No server was started and no database, payment, email, or SMS requests were executed. Runtime behavior and production deployment remain unverified.

## Working conventions

- Keep changes focused and match the surrounding CommonJS style. Coordinate API contract changes with the sibling frontend.
- Preserve pricing units, group identity, reservation expiry, and payment status semantics unless the task explicitly changes them.
- Add meaningful isolated coverage when changing registration/payment logic; do not use live registrations or real recipients as fixtures.
- Do not run `update.sh`, messaging scripts, or production mutations as routine validation. Keep generated bundles out of unrelated source edits.
