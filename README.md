# Token — campus canteen pre-order

A canteen ordering site that works the way Swiggy and Zomato work, minus the
delivery. You order from your desk, the kitchen sees it, and you collect by
token number.

**Right now this runs entirely in the browser.** All data lives in
localStorage, there is no database to install and no server to start. The
Express + MongoDB backend is written and parked in `server/` for later.

## Running it

Node 18+. From this folder:

```bash
npm run setup   # installs the client
npm run dev     # http://localhost:5173
npm test        # 58 checks against the local API
```

That is the whole setup. No .env, no MongoDB, no seed step.

## The way in

1. **The gate.** Seven photographic layers on a perspective stage, each moving
   at its own depth. It holds until you click.
2. **Sign in.** Two accounts already exist, one button each:

   | Role    | Email                | Password   |
   | ------- | -------------------- | ---------- |
   | Student | student@canteen.edu  | student123 |
   | Counter | staff@canteen.edu    | staff123   |

   Registering a new account works too and persists locally.
3. **The menu**, and everything after it.

To see both sides at once, sign in as the student in a normal window and as
counter staff in an incognito window. They talk to each other through the
browser's storage events, so an order really does move between the two.

## What the student gets

- Search with a 220ms debounce, category chips, veg filter, sorting by price,
  prep time or rating.
- A tray that survives a refresh, with quantity steppers and a live subtotal.
- Offer codes checked before you commit: FIRSTTRAY, CHAI10, BREAK50.
- Collection slots in 10 minute steps, and a note for the kitchen.
- Live tracking on a perforated token strip. Stages stamp in as the order
  moves and a toast fires the moment it is ready.
- Cancel while it is still waiting, mark it collected, rate each dish, and
  reorder anything from history in one tap.
- An assistant that reads the live menu and your last five orders. It parses
  budgets ("under 80", "for 30 rupees"), diet, heat and how much of a hurry
  you are in.

## What the counter gets

- A queue that fills itself. New orders arrive with a toast.
- One button per order to move it to the next stage.
- Stock control: mark anything sold out and it greys out everywhere.
- Daily limits per dish, with the remaining count shown to students under ten.
- A day view: orders, collected, revenue, fastest sellers, busiest hours.

## The kitchen cooks by itself

With nobody logged in at the counter, orders would sit at "placed" forever. So
each new order gets timestamps for its next stages and a ticker advances it:
accepted after 8 seconds, cooking after 20, ready after that plus 3 seconds per
minute of prep time. The timestamps are absolute, so progress survives a
refresh. The moment real staff advance an order by hand, its schedule is
dropped and the timer stops interfering.

## Wiring the backend back in

Everything talks to `lib/api.js`, which routes paths like `/menu?q=dosa` and
`/orders/:id/status` to local handlers. The paths, request bodies and response
shapes are the same ones `server/` returns. To switch over: replace the body of
`api()` with a fetch call, put the proxy back in `vite.config.js`, and swap
`lib/socket.js` for the socket.io client. Nothing else changes.

`server/` still holds the full Express app, Mongoose models and seed script.

## Design

The palette is the room: mint tiled walls, stainless steel, turmeric for
anything you act on, chilli red for anything wrong. Bricolage Grotesque for
display, Public Sans for reading, IBM Plex Mono for numbers that are genuinely
printed — token numbers, prices, times.

Dish cards have one clipped corner, like a steel tray. Motion is spent in one
place: the gate. After that things only move in response to something you did.

Every dish has a photo shot on the same surface under the same light. Any dish
without one falls back to a hand-drawn SVG glyph.

## Layout

```
client/public/img
  gate/     the seven layers the opening is built from
  scene/    category bands, kitchen pass, empty tray, receipt paper
  dish/     one photo per dish, named by slug

client/src
  components/Gate.jsx  the opening, lazy loaded
  data/seed.js         the 19 dishes, offers and demo accounts
  lib/api.js           the local API: every route, same shapes as the server
  lib/db.js            localStorage persistence
  lib/kitchen.js       the ticker that cooks orders
  lib/socket.js        event bus, and cross-tab messaging
  pages/               Menu, Dish, Checkout, Track, Orders, SignIn, Counter
  test/api.test.mjs    58 checks, run with npm test

server/                the Express + MongoDB backend, for later
```

## Known limits

- Passwords are stored in plain text in localStorage. This is demo data on your
  own machine, but do not reuse a real password.
- Clearing site data resets everything. There is a Reset button in the top bar
  that does it deliberately.
- Payments are recorded as a choice, not collected.
