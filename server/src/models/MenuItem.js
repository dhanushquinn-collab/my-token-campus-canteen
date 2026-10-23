import mongoose from 'mongoose'

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, index: true },
  veg: { type: Boolean, default: true },
  spice: { type: Number, min: 0, max: 3, default: 0 },
  prepMinutes: { type: Number, default: 8 },
  available: { type: Boolean, default: true },
  dailyLimit: { type: Number, default: 0 },
  soldToday: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  glyph: { type: String, default: 'plate' },
  ratingSum: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true })

menuItemSchema.virtual('rating').get(function () {
  return this.ratingCount ? Number((this.ratingSum / this.ratingCount).toFixed(1)) : 0
})

menuItemSchema.set('toJSON', { virtuals: true })
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text' })

export default mongoose.model('MenuItem', menuItemSchema)
