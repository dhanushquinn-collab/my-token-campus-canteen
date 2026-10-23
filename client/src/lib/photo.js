// Dish names map to photo files by slug. If a dish has no photo the card falls
// back to its line-art glyph, so the counter can add a dish without one.
const slug = name =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const dishPhoto = name => '/img/dish/' + slug(name) + '.webp'

export const SECTION_ART = {
  Breakfast: '/img/scene/breakfast.webp',
  Meals: '/img/scene/meals.webp',
  Snacks: '/img/scene/snacks.webp',
  Drinks: '/img/scene/drinks.webp',
  Sweets: '/img/scene/sweets.webp'
}
