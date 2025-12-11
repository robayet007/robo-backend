import fetch from 'node-fetch';

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  // ✅ Send message to any chat
  async sendMessage(chatId, message, keyboard = null) {
    try {
      const url = `${this.baseUrl}/sendMessage`;
      
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };
      
      // Add keyboard if provided
      if (keyboard) {
        payload.reply_markup = keyboard;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Message sent to:', chatId);
        return { success: true, data: data };
      } else {
        console.error('❌ Telegram error:', data.description);
        return { success: false, error: data.description };
      }
      
    } catch (error) {
      console.error('❌ Send error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Send message to admin
  async sendToAdmin(message, keyboard = null) {
    return await this.sendMessage(this.adminChatId, message, keyboard);
  }

  // ✅ Edit message text (with optional keyboard)
  async editMessageText(chatId, messageId, newText, keyboard = null) {
    try {
      const url = `${this.baseUrl}/editMessageText`;
      
      const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };
      
      // Add keyboard if provided (empty array = no buttons)
      if (keyboard) {
        payload.reply_markup = keyboard;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Message edited:', messageId);
        return { success: true, data: data };
      } else {
        console.error('❌ Edit error:', data.description);
        return { success: false, error: data.description };
      }
      
    } catch (error) {
      console.error('❌ Edit error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Create delivery buttons (NO COPY BUTTON)
  createDeliveryButtons() {
    return {
      inline_keyboard: [
        [
          {
            text: "✅ মার্ক ডেলিভার্ড",
            callback_data: "mark_delivered"
          },
          {
            text: "❌ মার্ক ফেইল্ড", 
            callback_data: "mark_failed"
          }
        ]
      ]
    };
  }

  // ✅ Send payment notification with delivery buttons only
  async sendPaymentNotification(paymentData) {
    try {
      const { 
        transactionId, 
        amount, 
        playerId, 
        productName, 
        diamonds,
        productType
      } = paymentData;
      
      const currentTime = new Date().toLocaleString('bn-BD', {
        timeZone: 'Asia/Dhaka',
        hour12: true
      });
      
      // Determine KTP format
      let ktpFormat = '';
      if (productType === 'weekly') {
        ktpFormat = `Ktp ${playerId} 161`;
      } else if (productType === 'monthly') {
        ktpFormat = `Ktp ${playerId} 800`;
      } else if (productType === 'diamond' && diamonds > 0) {
        ktpFormat = `Ktp ${playerId} ${diamonds}`;
      } else {
        ktpFormat = `Ktp ${playerId}`;
      }
      
      // Create message with KTP format visible
      const message = `💰 <b>নতুন পেমেন্ট রিসিভ্ড!</b>\n\n` +
        `📌 <b>ট্রান্সেকশন ID:</b> <code>${transactionId}</code>\n` +
        `💵 <b>টাকা:</b> ${amount} ৳\n` +
        `🎮 <b>Player ID:</b> <code>${playerId}</code>\n` +
        `📦 <b>পণ্য:</b> ${productName}\n` +
        (diamonds > 0 ? `💎 <b>ডায়মন্ড:</b> ${diamonds}\n` : '') +
        `⏰ <b>সময়:</b> ${currentTime}\n\n` +
        `<b>টপ আপ কোড:</b>\n` +
        `<code>${ktpFormat}</code>\n\n` +
        `✅ <b>পেমেন্ট ভেরিফাইড</b>\n` +
        `🚀 <b>ডেলিভারী শুরু করুন!</b>\n\n` +
        `🔗 <i>Robo Top Up System</i>`;
      
      console.log('📤 Notification sent:', transactionId);
      
      // Create delivery buttons (no copy button)
      const keyboard = this.createDeliveryButtons();
      
      return await this.sendToAdmin(message, keyboard);
      
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Answer callback query
  async answerCallbackQuery(callbackQueryId, text) {
    try {
      const url = `${this.baseUrl}/answerCallbackQuery`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text,
          show_alert: true
        })
      });

      const data = await response.json();
      return { success: data.ok };
      
    } catch (error) {
      console.error('Callback error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Test connection
  async testConnection() {
    try {
      const url = `${this.baseUrl}/getMe`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.ok) {
        console.log('✅ Bot connected:', data.result.username);
        return { success: true, data: data };
      } else {
        console.error('❌ Connection failed');
        return { success: false, error: data.description };
      }
      
    } catch (error) {
      console.error('❌ Test error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new TelegramService();