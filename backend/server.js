import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
import paymentRoutes from './routes/paymentRoutes.js';
import productRoutes from './routes/productRoutes.js';
import telegramWebhook from './routes/telegramWebhook.js'; // ✅ নতুন import

// Database connection
import connectDB from './utils/database.js';
connectDB();

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/telegram', telegramWebhook); // ✅ নতুন route যোগ করুন

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Robo TopUp API is running',
    timestamp: new Date().toISOString()
  });
});

// Telegram webhook test endpoint
app.get('/api/telegram/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Telegram webhook is working',
    webhookUrl: `${req.protocol}://${req.get('host')}/api/telegram/webhook`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`🤖 Telegram Webhook: http://localhost:${PORT}/api/telegram/webhook`); // ✅ লগ যোগ করুন
});