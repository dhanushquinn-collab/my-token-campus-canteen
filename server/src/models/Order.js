import mongoose from 'mongoose'

export const STAGES = ['placed', 'accepted', 'cooking', 'ready', 'collected']

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: String,
    price: Number,
    qty: Number,
    veg: Boolean
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  pickupAt: { type: Date, required: true },
  note: { type: String, default: '' },
  payment: { type: String, enum: ['counter', 'upi'], default: 'counter' },
  status: { type: String, enum: [...STAGES, 'cancelled'], default: 'placed', index: true },
  history: [{ status: String, at: { type: Date, default: Date.now } }],
  prepMinutes: { type: Number, default: 10 },
  rated: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('Order', orderSchema)
