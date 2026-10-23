import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  stars: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, default: '', maxlength: 400 }
}, { timestamps: true })

export default mongoose.model('Review', reviewSchema)
