import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff'], default: 'student' },
  phone: { type: String, default: '' },
  vegOnly: { type: Boolean, default: false }
}, { timestamps: true })

userSchema.methods.toSafe = function () {
  return { id: this._id, name: this.name, email: this.email, role: this.role, phone: this.phone, vegOnly: this.vegOnly }
}

export default mongoose.model('User', userSchema)
