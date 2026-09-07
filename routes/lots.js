// routes/lots.js
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const ANTI_SNIPE_WINDOW_MS = 30 * 1000;    // bids in the last 30s of a lot...
const ANTI_SNIPE_EXTEND_MS = 2 * 60 * 1000; // ...push the close time out by 2 minutes

module.exports = function (broadcast) {
  const router = express.Router();

  function closeExpiredLots() {
    const now = Date.now();
    db.prepare(`UPDATE lots SET status = 'closed' WHERE status = 'active' AND closes_at <= ?`).run(now);
  }

  // GET /api/lots - list all lots (closes expired ones first)
  router.get('/', (req, res) => {
    closeExpiredLots();
    const lots = db.prepare('SELECT * FROM lots ORDER BY created_at DESC').all();
    res.json({ lots });
  });

  // GET /api/lots/:id - single lot + its bid history
  router.get('/:id', (req, res) => {
    closeExpiredLots();
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Lot not found.' });
    const bids = db.prepare(`
      SELECT bids.id, bids.amount, bids.created_at, users.email
      FROM bids JOIN users ON users.id = bids.user_id
      WHERE lot_id = ? ORDER BY bids.created_at DESC
    `).all(req.params.id);
    res.json({ lot, bids });
  });

  // POST /api/lots/:id/bids - place a bid (requires login)
  router.post('/:id/bids', requireAuth, (req, res) => {
    closeExpiredLots();
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Lot not found.' });
    if (lot.status !== 'active') return res.status(400).json({ error: 'This lot has closed.' });

    const amount = Number(req.body.amount);
    const minValid = lot.current_bid + lot.min_increment;
    if (!amount || amount < minValid) {
      return res.status(400).json({ error: `Minimum bid is ${minValid}.` });
    }

    const now = Date.now();
    let closesAt = lot.closes_at;
    const msLeft = closesAt - now;
    let extended = false;
    if (msLeft > 0 && msLeft < ANTI_SNIPE_WINDOW_MS) {
      closesAt += ANTI_SNIPE_EXTEND_MS;
      extended = true;
    }

    const txn = db.transaction(() => {
      db.prepare('INSERT INTO bids (lot_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)')
        .run(lot.id, req.user.id, amount, now);
      db.prepare('UPDATE lots SET current_bid = ?, bid_count = bid_count + 1, closes_at = ? WHERE id = ?')
        .run(amount, closesAt, lot.id);
    });
    txn();

    const updatedLot = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id);

    // tell every connected browser about the new price immediately
    broadcast({ type: 'bid_placed', lot: updatedLot, extended });

    res.json({ lot: updatedLot, extended });
  });

  return router;
};
