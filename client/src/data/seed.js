// The starting counter. Same 19 dishes the server seeds, so nothing changes
// when the real backend gets wired in later.

export const DISHES = [
  { name: 'Masala Dosa', description: 'Crisp dosa, potato masala, coconut chutney and sambar.', price: 60, category: 'Breakfast', veg: true, spice: 1, prepMinutes: 8, glyph: 'dosa', tags: ['south indian', 'filling'] },
  { name: 'Idli Vada Combo', description: 'Two idlis, one medu vada, sambar and chutney.', price: 45, category: 'Breakfast', veg: true, spice: 1, prepMinutes: 4, glyph: 'idli', tags: ['light', 'quick'] },
  { name: 'Poori Saagu', description: 'Three pooris with Bengaluru style potato saagu.', price: 50, category: 'Breakfast', veg: true, spice: 1, prepMinutes: 7, glyph: 'poori', tags: ['filling'] },
  { name: 'Veg Pulao', description: 'Basmati rice cooked with seasonal vegetables and raita.', price: 80, category: 'Meals', veg: true, spice: 1, prepMinutes: 10, glyph: 'rice', tags: ['lunch'] },
  { name: 'North Indian Thali', description: 'Two rotis, dal, sabzi, rice, curd and salad.', price: 95, category: 'Meals', veg: true, spice: 2, prepMinutes: 12, glyph: 'thali', tags: ['lunch', 'filling'], dailyLimit: 60 },
  { name: 'Chicken Biryani', description: 'Long grain rice, marinated chicken, raita and boiled egg.', price: 140, category: 'Meals', veg: false, spice: 2, prepMinutes: 14, glyph: 'biryani', tags: ['lunch', 'popular'], dailyLimit: 40 },
  { name: 'Egg Fried Rice', description: 'Wok tossed rice with egg, spring onion and pepper.', price: 90, category: 'Meals', veg: false, spice: 2, prepMinutes: 9, glyph: 'rice', tags: ['lunch'] },
  { name: 'Paneer Butter Masala', description: 'Paneer in a mild tomato butter gravy. Comes with two rotis.', price: 120, category: 'Meals', veg: true, spice: 1, prepMinutes: 12, glyph: 'curry', tags: ['rich'] },
  { name: 'Gobi Manchurian', description: 'Fried cauliflower tossed in a sharp Indo-Chinese sauce.', price: 70, category: 'Snacks', veg: true, spice: 3, prepMinutes: 9, glyph: 'bowl', tags: ['spicy', 'share'] },
  { name: 'Veg Puff', description: 'Flaky puff with a spiced vegetable filling. Baked hourly.', price: 25, category: 'Snacks', veg: true, spice: 1, prepMinutes: 2, glyph: 'puff', tags: ['quick', 'cheap'] },
  { name: 'Samosa Chaat', description: 'Crushed samosa, chole, curd, chutneys and sev.', price: 55, category: 'Snacks', veg: true, spice: 2, prepMinutes: 5, glyph: 'chaat', tags: ['snack'] },
  { name: 'Chicken Roll', description: 'Kathi roll with grilled chicken, onion and mint mayo.', price: 85, category: 'Snacks', veg: false, spice: 2, prepMinutes: 8, glyph: 'roll', tags: ['handheld'] },
  { name: 'Maggi Masala', description: 'Hostel classic, cooked with onion, chilli and extra masala.', price: 40, category: 'Snacks', veg: true, spice: 2, prepMinutes: 6, glyph: 'noodles', tags: ['comfort', 'cheap'] },
  { name: 'Filter Coffee', description: 'Degree coffee, strong decoction, served hot.', price: 20, category: 'Drinks', veg: true, spice: 0, prepMinutes: 2, glyph: 'coffee', tags: ['quick', 'cheap'] },
  { name: 'Masala Chai', description: 'Ginger and cardamom tea, boiled properly.', price: 15, category: 'Drinks', veg: true, spice: 0, prepMinutes: 2, glyph: 'chai', tags: ['quick', 'cheap'] },
  { name: 'Cold Coffee', description: 'Blended cold coffee with milk and ice.', price: 55, category: 'Drinks', veg: true, spice: 0, prepMinutes: 4, glyph: 'shake', tags: ['cold'] },
  { name: 'Fresh Lime Soda', description: 'Lime, soda, salt or sweet, your call at the counter.', price: 30, category: 'Drinks', veg: true, spice: 0, prepMinutes: 3, glyph: 'soda', tags: ['cold', 'quick'] },
  { name: 'Gulab Jamun', description: 'Two pieces, warm, in cardamom syrup.', price: 35, category: 'Sweets', veg: true, spice: 0, prepMinutes: 2, glyph: 'sweet', tags: ['dessert'] },
  { name: 'Fruit Custard', description: 'Chilled custard with seasonal fruit.', price: 45, category: 'Sweets', veg: true, spice: 0, prepMinutes: 2, glyph: 'sweet', tags: ['cold', 'dessert'] }
]

export const COUPONS = [
  { code: 'FIRSTTRAY', kind: 'percent', value: 20, maxDiscount: 40, minSubtotal: 100, note: '20% off your first tray over 100.', active: true },
  { code: 'CHAI10', kind: 'flat', value: 10, minSubtotal: 50, note: '10 off when you spend 50 or more.', active: true },
  { code: 'BREAK50', kind: 'percent', value: 15, maxDiscount: 30, minSubtotal: 80, note: '15% off between classes.', active: true }
]

export const DEMO_USERS = [
  { name: 'Counter Staff', email: 'staff@canteen.edu', password: 'staff123', role: 'staff', phone: '' },
  { name: 'Dhanush J', email: 'student@canteen.edu', password: 'student123', role: 'student', phone: '9000000000' }
]
