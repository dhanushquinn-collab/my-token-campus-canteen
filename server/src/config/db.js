import mongoose from 'mongoose'

export async function connectDB(uri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    family: 4
  })
  console.log('mongo connected:', mongoose.connection.name)
}
