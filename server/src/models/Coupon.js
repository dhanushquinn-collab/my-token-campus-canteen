import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  kind: { type: String, enum: ['percent', 'flat'], default: 'percent' },
  value: { type: Number, required: true },
  maxDiscount: { type: Number, default: 0 },
  minSubtotal: { type: Number, default: 0 },
  note: { type: String, default: '' },
  active: { type: Boolean, default: true },
  timesUsed: { type: Number, default: 0 }
}, { timestamps: true })

couponSchema.methods.discountFor = function (subtotal) {
  if (!this.active || subtotal < this.minSubtotal) return 0
  let d = this.kind === 'percent' ? (subtotal * this.value) / 100 : this.value
  if (this.maxDiscount) d = Math.min(d, this.maxDiscount)
  return Math.min(Math.round(d), subtotal)
}

export default mongoose.model('Coupon', couponSchema)
