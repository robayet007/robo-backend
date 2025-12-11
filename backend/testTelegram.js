import TelegramService from './services/telegramService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testTelegram() {
  console.log('🚀 Testing Telegram Bot Connection...\n');
  
  // 1. Test bot connection
  console.log('1. Testing bot connection...');
  const connectionTest = await TelegramService.testConnection();
  
  if (!connectionTest.success) {
    console.log('❌ Bot connection failed. Please check your token.');
    return;
  }
  
  // 2. Test message sending
  console.log('\n2. Sending test message...');
  const messageTest = await TelegramService.sendPaymentNotification({
    transactionId: 'TEST123456',
    amount: 100,
    playerId: '123456789',
    productName: 'Test Diamond Pack',
    diamonds: 50
  });
  
  if (messageTest.success) {
    console.log('✅ Test message sent successfully!');
    console.log('📱 Check your Telegram now!');
  } else {
    console.log('❌ Failed to send message:', messageTest.error);
  }
  
  console.log('\n🔧 Bot Configuration:');
  console.log('Token:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('Chat ID:', process.env.TELEGRAM_ADMIN_CHAT_ID ? '✅ Set' : '❌ Missing');
}

testTelegram();