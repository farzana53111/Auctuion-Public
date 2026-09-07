// routes/admin.js
const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

module.exports = function (broadcast) {
  const router = express.Router();
  router.use(requireAdmin);

  // ----- Lots -----

  router.get('/lots', (req, res) => {
    const lots = db.prepare('SELECT * FROM lots ORDER BY created_at DESC').all();
    res.json({ lots });
  });

  router.post('/lots', (req, res) => {
    const {
      lot_no, category, title, grade, description,
      art_class, starting_bid, min_increment, closes_in_minutes, featured
    } = req.body;

    if (!lot_no || !category || !title || !starting_bid || !closes_in_minutes) {
      return res.status(400).json({ error: 'lot_no, category, title, starting_bid, and closes_in_minutes are required.' });
    }
    const existing = db.prepare('SELECT id FROM lots WHERE lot_no = ?').get(lot_no);
    if (existing) return res.status(409).json({ error: 'A lot with that lot number already exists.' });

    const info = db.prepare(`
      INSERT INTO lots
        (lot_no, category, title, grade, description, art_class, starting_bid,
         current_bid, min_increment, bid_count, closes_at, status, featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?, ?)
    `).run(
      lot_no, category, title, grade || '', description || '',
      art_class || 'art-1', starting_bid, starting_bid,
      min_increment || 25, Date.now() + Number(closes_in_minutes) * 60000,
      featured ? 1 : 0, Date.now()
    );

    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(info.lastInsertRowid);
    broadcast({ type: 'lot_created', lot });
    res.json({ lot });
  });

  router.put('/lots/:id', (req, res) => {
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Lot not found.' });

    const fields = ['category', 'title', 'grade', 'description', 'art_class', 'min_increment', 'featured', 'status'];
    const updates = {};
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.body.closes_in_minutes !== undefined) {
      updates.closes_at = Date.now() + Number(req.body.closes_in_minutes) * 60000;
    }

    const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    if (setClause) {
      db.prepare(`UPDATE lots SET ${setClause} WHERE id = @id`).run({ ...updates, id: lot.id });
    }
    const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id);
    broadcast({ type: 'lot_updated', lot: updated });
    res.json({ lot: updated });
  });

  router.post('/lots/:id/close', (req, res) => {
    const lot = db.prepare('SELECT * FROM lots WHERE id = ?').get(req.params.id);
    if (!lot) return res.status(404).json({ error: 'Lot not found.' });
    db.prepare(`UPDATE lots SET status = 'closed' WHERE id = ?`).run(lot.id);
    const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(lot.id);
    broadcast({ type: 'lot_closed', lot: updated });
    res.json({ lot: updated });
  });

  router.delete('/lots/:id', (req, res) => {
    db.prepare('DELETE FROM bids WHERE lot_id = ?').run(req.params.id);
    db.prepare('DELETE FROM lots WHERE id = ?').run(req.params.id);
    broadcast({ type: 'lot_deleted', id: Number(req.params.id) });
    res.json({ ok: true });
  });

  // ----- Users -----

  router.get('/users', (req, res) => {
    const users = db.prepare('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  });

  // ----- Activity (recent bids across all lots) -----

  router.get('/activity', (req, res) => {
    const bids = db.prepare(`
      SELECT bids.id, bids.amount, bids.created_at, users.email, lots.lot_no, lots.title
      FROM bids
      JOIN users ON users.id = bids.user_id
      JOIN lots ON lots.id = bids.lot_id
      ORDER BY bids.created_at DESC
      LIMIT 50
    `).all();
    res.json({ bids });
  });

  return router;
};
