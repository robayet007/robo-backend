import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  playerId: {
    type: String,
    required: [true, 'Player ID is required'],
    trim: true
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  diamonds: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'completed', 'failed'],
    default: 'pending'
  },
  bkashNumber: {
    type: String,
    default: '01766325020'
  },
  telegramNotification: {  // ✅ New field
    type: Boolean,
    default: false
  },
  telegramMessageId: {  // ✅ New field
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;