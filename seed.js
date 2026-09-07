// seed.js
// Run once with: npm run seed
// Creates a default admin account, a demo bidder account, and starter lots.
// Safe to re-run — it skips anything that already exists.

const bcrypt = require('bcryptjs');
const db = require('./db');

function upsertUser(email, password, role) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`User already exists: ${email}`);
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
  ).run(email, hash, role, Date.now());
  console.log(`Created ${role} user: ${email} / ${password}`);
}

upsertUser('admin@minthouse.test', 'admin123', 'admin');
upsertUser('bidder@minthouse.test', 'bidder123', 'bidder');

const starterLots = [
  {
    lot_no: '014',
    category: 'Trading cards',
    title: '1988 Delgado Rookie Card',
    grade: 'PSA 9',
    description: 'A key rookie card from the 1988 set, graded PSA 9 with sharp corners and strong centering.',
    art_class: 'art-1',
    starting_bid: 3500,
    current_bid: 4200,
    min_increment: 100,
    minutes_to_close: 10,
    featured: 1
  },
  {
    lot_no: '033',
    category: 'Memorabilia',
    title: '1998 Championship Ring, Player Issue',
    grade: 'Near mint',
    description: 'Player-issue championship ring from the 1998 season, accompanied by a letter of provenance.',
    art_class: 'art-2',
    starting_bid: 15000,
    current_bid: 18500,
    min_increment: 500,
    minutes_to_close: 25,
    featured: 0
  },
  {
    lot_no: '007',
    category: 'Comics',
    title: 'Nova Sentinel #1, First Print',
    grade: 'CGC 9.6',
    description: 'First printing of the debut issue, CGC graded 9.6 with white pages.',
    art_class: 'art-3',
    starting_bid: 400,
    current_bid: 610,
    min_increment: 25,
    minutes_to_close: 60,
    featured: 0
  },
  {
    lot_no: '021',
    category: 'Trading cards',
    title: 'Ironclad Tactics — Holo Edition #001',
    grade: 'Gem 10',
    description: 'First-print holographic card from the Ironclad Tactics trading card game, graded Gem 10.',
    art_class: 'art-4',
    starting_bid: 700,
    current_bid: 980,
    min_increment: 50,
    minutes_to_close: 90,
    featured: 0
  },
  {
    lot_no: '045',
    category: 'Memorabilia',
    title: 'Away Jersey, 2003 Season',
    grade: 'Game-worn',
    description: 'Game-worn away jersey from the 2003 season, with photo-matched documentation.',
    art_class: 'art-5',
    starting_bid: 2500,
    current_bid: 3150,
    min_increment: 100,
    minutes_to_close: 35,
    featured: 0
  },
  {
    lot_no: '002',
    category: 'Timepieces',
    title: 'Vintage Chronograph, Reference No. 4',
    grade: 'Serviced 2024',
    description: 'Vintage chronograph, fully serviced in 2024, original dial and hands.',
    art_class: 'art-6',
    starting_bid: 6500,
    current_bid: 7800,
    min_increment: 200,
    minutes_to_close: 45,
    featured: 0
  }
];

const insertLot = db.prepare(`
  INSERT INTO lots
    (lot_no, category, title, grade, description, art_class, starting_bid,
     current_bid, min_increment, bid_count, closes_at, status, featured, created_at)
  VALUES (@lot_no, @category, @title, @grade, @description, @art_class, @starting_bid,
     @current_bid, @min_increment, @bid_count, @closes_at, 'active', @featured, @created_at)
`);

starterLots.forEach(l => {
  const existing = db.prepare('SELECT id FROM lots WHERE lot_no = ?').get(l.lot_no);
  if (existing) {
    console.log(`Lot already exists: ${l.lot_no}`);
    return;
  }
  insertLot.run({
    lot_no: l.lot_no,
    category: l.category,
    title: l.title,
    grade: l.grade,
    description: l.description,
    art_class: l.art_class,
    starting_bid: l.starting_bid,
    current_bid: l.current_bid,
    min_increment: l.min_increment,
    bid_count: 3,
    closes_at: Date.now() + l.minutes_to_close * 60 * 1000,
    featured: l.featured,
    created_at: Date.now()
  });
  console.log(`Created lot ${l.lot_no}: ${l.title}`);
});

console.log('\nSeeding complete.');
