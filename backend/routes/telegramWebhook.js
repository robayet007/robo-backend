import express from 'express';
import TelegramService from '../services/telegramService.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// ✅ Set Telegram webhook
router.post('/set-webhook', async (req, res) => {
  try {
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/telegram/webhook`;
    
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    const data = await response.json();
    
    res.status(200).json({
      success: data.ok,
      message: data.ok ? 'Webhook set successfully' : 'Failed to set webhook',
      data: data
    });
    
  } catch (error) {
    console.error('Set webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set webhook'
    });
  }
});

// ✅ Telegram webhook endpoint - বাটন ছাড়া
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // কোনো callback/button handling থাকবে না
    // শুধু regular messages handle করবে
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      
      console.log('📱 Message received:', text);
      
      if (text === '/start') {
        await TelegramService.sendMessage(
          chatId,
          `🤖 <b>রোবো টপ আপ সিস্টেম</b>\n\n` +
          `এই বটটি শুধুমাত্র এডমিন নোটিফিকেশনের জন্য।\n` +
          `নতুন পেমেন্ট হলে এখানে নোটিফিকেশন পাবেন।\n\n` +
          `🔗 <i>No buttons - Text only notifications</i>`
        );
      }
      else if (text === '/test') {
        // Send test notification WITHOUT buttons
        const testPayment = {
          transactionId: 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          amount: 100 + Math.floor(Math.random() * 900),
          playerId: '5432' + Math.floor(Math.random() * 10),
          productName: ['Weekly Membership', 'Monthly VIP', 'Diamond Pack'][Math.floor(Math.random() * 3)],
          diamonds: Math.floor(Math.random() * 1000),
          productType: 'weekly'
        };
        
        await TelegramService.sendSimpleNotification(testPayment);
        
        await TelegramService.sendMessage(
          chatId,
          `✅ টেস্ট নোটিফিকেশন পাঠানো হয়েছে!`
        );
      }
      else if (text.startsWith('/status')) {
        // Check order status
        const parts = text.split(' ');
        if (parts.length > 1) {
          const transactionId = parts[1];
          
          const payment = await Payment.findOne({ transactionId: transactionId });
          
          if (payment) {
            let statusEmoji = '⏳';
            if (payment.status === 'completed') statusEmoji = '✅';
            if (payment.status === 'failed') statusEmoji = '❌';
            
            await TelegramService.sendMessage(
              chatId,
              `📊 <b>অর্ডার স্ট্যাটাস</b>\n\n` +
              `📌 ট্রান্সেকশন: ${payment.transactionId}\n` +
              `🎮 Player: ${payment.playerId}\n` +
              `💵 Amount: ${payment.amount}৳\n` +
              `📦 Product: ${payment.productName}\n` +
              `${statusEmoji} Status: ${payment.status}\n` +
              `⏰ Time: ${new Date(payment.createdAt).toLocaleString('bn-BD')}`
            );
          } else {
            await TelegramService.sendMessage(
              chatId,
              `❌ ট্রান্সেকশন ID খুঁজে পাওয়া যায়নি: ${transactionId}`
            );
          }
        }
      }
    }
    
    res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ ok: true });
  }
});

// ✅ Get webhook info
router.get('/webhook-info', async (req, res) => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    const data = await response.json();
    
    res.status(200).json({
      success: data.ok,
      data: data.result
    });
    
  } catch (error) {
    console.error('Get webhook info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook info'
    });
  }
});

// ✅ Send test notification (NO BUTTONS)
router.post('/test-notification', async (req, res) => {
  try {
    const testPayment = {
      transactionId: 'TEST' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: 100 + Math.floor(Math.random() * 900),
      playerId: '5432' + Math.floor(Math.random() * 10),
      productName: 'Weekly Membership',
      diamonds: 161,
      productType: 'weekly'
    };
    
    // Use simple notification (no buttons)
    const result = await TelegramService.sendSimpleNotification(testPayment);
    
    res.status(200).json({
      success: result.success,
      message: 'Test notification sent (no buttons)',
      transactionId: testPayment.transactionId
    });
    
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

// ✅ Mark order as completed (API endpoint instead of button)
router.post('/mark-delivered/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const payment = await Payment.findOneAndUpdate(
      { transactionId: transactionId },
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Send completion notification
    await TelegramService.sendToAdmin(
      `✅ <b>অর্ডার ডেলিভার্ড মার্ক করা হয়েছে!</b>\n\n` +
      `📌 ট্রান্সেকশন: ${transactionId}\n` +
      `🎮 Player ID: ${payment.playerId}\n` +
      `📦 প্রোডাক্ট: ${payment.productName}\n` +
      `⏰ সময়: ${new Date().toLocaleString('bn-BD')}\n\n` +
      `🎉 <b>স্ট্যাটাস: ✅ COMPLETED</b>`
    );
    
    res.status(200).json({
      success: true,
      message: 'Order marked as delivered',
      transactionId: transactionId
    });
    
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as delivered'
    });
  }
});

// ✅ Mark order as failed (API endpoint instead of button)
router.post('/mark-failed/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const payment = await Payment.findOneAndUpdate(
      { transactionId: transactionId },
      { 
        status: 'failed',
        failedAt: new Date(),
        failedReason: req.body.reason || 'Manual cancellation'
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Send failure notification
    await TelegramService.sendToAdmin(
      `❌ <b>অর্ডার ফেইল্ড মার্ক করা হয়েছে!</b>\n\n` +
      `📌 ট্রান্সেকশন: ${transactionId}\n` +
      `🎮 Player ID: ${payment.playerId}\n` +
      `📦 প্রোডাক্ট: ${payment.productName}\n` +
      `⏰ সময়: ${new Date().toLocaleString('bn-BD')}\n` +
      `📝 কারণ: ${req.body.reason || 'Manual cancellation'}\n\n` +
      `🚫 <b>স্ট্যাটাস: ❌ FAILED</b>`
    );
    
    res.status(200).json({
      success: true,
      message: 'Order marked as failed',
      transactionId: transactionId
    });
    
  } catch (error) {
    console.error('Mark failed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as failed'
    });
  }
});

export default router;