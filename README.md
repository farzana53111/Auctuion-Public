# Minthouse — live auction marketplace (demo build)

A working auction site: buyer-facing marketplace, real accounts, a SQLite
database, live bidding over WebSockets, and a full admin dashboard for
managing lots. Built as a complete, original example — not a copy of any
existing company's site — so you can use it as a real starting point or a
learning reference.

## What's included

- **Backend** — Node.js + Express API (`server.js`, `routes/`)
- **Database** — SQLite via `better-sqlite3`, stored in `minthouse.db` (created automatically)
- **Real-time bidding** — WebSocket server (`ws`) broadcasts every bid to all connected browsers instantly
- **Accounts** — email/password auth with hashed passwords (`bcryptjs`) and JWT sessions
- **Buyer site** — `public/index.html`: browse lots, sign in, place bids, watch live countdowns
- **Admin dashboard** — `public/admin.html`: create/edit/close/delete lots, view all bids, view registered users
- **Anti-sniping** — a bid placed in the final 30 seconds of a lot automatically extends its close time by 2 minutes, so last-second bids can always be topped

## Running it locally

You'll need [Node.js](https://nodejs.org) 18 or later installed.

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and set a real JWT secret
cp .env.example .env
# then edit .env and change JWT_SECRET to a long random string

# 3. Create the database and seed starter data (default accounts + demo lots)
npm run seed

# 4. Start the server
npm start
```

Then open:
- **Buyer site:** http://localhost:3000
- **Admin dashboard:** http://localhost:3000/admin.html

### Default accounts (created by `npm run seed`)

| Role   | Email                    | Password   |
|--------|---------------------------|------------|
| Admin  | admin@minthouse.test       | admin123   |
| Bidder | bidder@minthouse.test      | bidder123  |

**Change or remove these before putting the site anywhere public.**

## How to add / manage products

You don't need to touch any code for day-to-day use — everything is done
through the admin dashboard:

1. Sign in at `/admin.html` with an admin account.
2. Go to **Lots → + New lot**.
3. Fill in the lot number, category, title, grade, description, starting
   bid, minimum increment, and how many minutes until it closes.
4. Save — it appears on the live buyer site immediately (over the
   WebSocket connection, no refresh needed).

From the same **Lots** table you can edit a lot's details, close it early,
or delete it. The **Bid activity** and **Users** pages give you visibility
into everything happening on the site.

## Project structure

```
minthouse-app/
  server.js          — starts Express + WebSocket server
  db.js              — SQLite schema and connection
  seed.js            — creates default accounts and starter lots
  middleware/
    auth.js          — JWT verification, admin role guard
  routes/
    auth.js          — register / login / current user
    lots.js           — public lot listing + bidding
    admin.js          — admin-only lot/user/activity management
  public/
    index.html        — buyer-facing site
    admin.html         — admin dashboard
  .env.example         — environment variable template
```

## Going from "demo" to "production"

This app is fully functional, but a handful of things are simplified for a
demo and worth hardening before you handle real money or real users:

1. **Switch to a production database.** SQLite is great for a single
   server, but for real scale move to Postgres or MySQL. Only `db.js`
   needs to change — every route calls functions from that one file.

2. **Add real payments.** Right now winning a lot doesn't charge anyone.
   Integrate [Stripe](https://stripe.com/docs/payments) (or a similar
   processor) to charge the winning bidder and, ideally, hold funds in
   escrow until the item is confirmed delivered. This typically means:
   - Collecting a card on file when a user registers or bids
   - Charging automatically when a lot closes with them as the high bidder
   - A payout flow to pay sellers after delivery is confirmed

3. **Add image uploads.** Lots currently use abstract gradient art. Add
   an image upload field (e.g. using [Multer](https://github.com/expressjs/multer)
   for local storage, or S3/Cloudinary for production) and store the
   resulting URL on the lot.

4. **Verify identities for high-value bidding.** For expensive lots,
   consider requiring ID verification or a card-on-file before a user can
   bid, to cut down on non-paying winners.

5. **Add HTTPS and a real domain.** Deploy behind a reverse proxy (e.g.
   Nginx, Caddy, or a platform like Render/Railway/Fly.io) with a TLS
   certificate — never run real user passwords or payments over plain
   HTTP.

6. **Rate-limit and validate more strictly.** Add request rate limiting
   (e.g. `express-rate-limit`) to the bidding and auth endpoints to
   prevent abuse, and consider a proper validation library (e.g. `zod`)
   for all API inputs.

7. **Back up the database.** Whatever database you end up on, set up
   automated backups before you're holding real bid data.

8. **Environment secrets.** Never commit your real `.env` file. Set
   `JWT_SECRET` (and any payment provider keys) as environment variables
   on your hosting platform instead.

## Notes

- All product names, images, and branding in the seed data are original
  placeholder content for demonstration purposes.
- The WebSocket reconnect logic in both `index.html` and `admin.html`
  automatically retries every 2 seconds if the connection drops, so a
  server restart won't permanently break the live page.
