import mongoose from 'mongoose';

const smsSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  forwarded: {
    type: Boolean,
    default: false
  },
  forwardedAt: Date,
  status: {
    type: String,
    enum: ['received', 'forwarded', 'failed'],
    default: 'received'
  }
}, {
  timestamps: true
});

// No pre-save middleware for now
export default mongoose.model('Sms', smsSchema);