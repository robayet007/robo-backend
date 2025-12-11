import axios from 'axios';

class WhatsAppService {
  constructor() {
    // আপনার WhatsApp number (8801766325020)
    this.adminNumber = '8801766325020';
  }

  // ✅ Send WhatsApp message using WhatsApp Web API
  async sendMessage(message) {
    try {
      // Method 1: Using WhatsApp Web API (no token needed)
      const apiUrl = `https://api.whatsapp.com/send`;
      
      // Create WhatsApp link (user will click to open WhatsApp)
      const encodedMessage = encodeURIComponent(message);
      const whatsappLink = `${apiUrl}?phone=${this.adminNumber}&text=${encodedMessage}`;
      
      console.log('📱 WhatsApp Link:', whatsappLink);
      
      // Return the link - frontend will open it
      return {
        success: true,
        link: whatsappLink,
        message: 'WhatsApp link generated successfully'
      };
      
    } catch (error) {
      console.error('WhatsApp service error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ Send Payment Notification
  async sendPaymentNotification(paymentData) {
    try {
      const { transactionId, amount, playerId, productName, diamonds } = paymentData;
      
      const message = `💰 *নতুন পেমেন্ট রিসিভ্ড!*\n\n` +
        `📌 *ট্রান্সেকশন:* ${transactionId}\n` +
        `💵 *টাকা:* ${amount} টাকা\n` +
        `🎮 *Player ID:* ${playerId}\n` +
        `📦 *পণ্য:* ${productName}\n` +
        `💎 *ডায়মন্ড:* ${diamonds}\n` +
        `⏰ *সময়:* ${new Date().toLocaleString('bn-BD')}\n\n` +
        `✅ *পেমেন্ট ভেরিফাইড*\n` +
        `🚀 *ডেলিভারী শুরু করুন!*`;
      
      return await this.sendMessage(message);
      
    } catch (error) {
      console.error('Payment notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new WhatsAppService();