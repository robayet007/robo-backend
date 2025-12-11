import express from 'express';
import Payment from '../models/Payment.js';
import TelegramService from '../services/telegramService.js';

const router = express.Router();

// ✅ Test Telegram endpoint
router.get('/test-telegram', async (req, res) => {
  try {
    // Test connection
    const connectionTest = await TelegramService.testConnection();
    
    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        message: 'Telegram bot connection failed',
        error: connectionTest.error
      });
    }
    
    // Send test message with different formats
    console.log('\n📱 Testing different message formats...\n');
    
    // Test 1: Weekly
    const weeklyTest = await TelegramService.sendPaymentNotification({
      transactionId: 'WEEKLY' + Date.now().toString().slice(-6),
      amount: 149,
      playerId: 'TEST12345',
      productName: '1x weekly',
      diamonds: 0,
      productType: 'weekly'
    });
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Monthly
    const monthlyTest = await TelegramService.sendPaymentNotification({
      transactionId: 'MONTHLY' + Date.now().toString().slice(-6),
      amount: 349,
      playerId: 'TEST67890',
      productName: 'Monthly Membership',
      diamonds: 0,
      productType: 'monthly'
    });
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Diamond
    const diamondTest = await TelegramService.sendPaymentNotification({
      transactionId: 'DIAMOND' + Date.now().toString().slice(-6),
      amount: 185,
      playerId: 'TEST54321',
      productName: '240 Diamond',
      diamonds: 240,
      productType: 'diamond'
    });
    
    const allTests = {
      weekly: weeklyTest.success,
      monthly: monthlyTest.success,
      diamond: diamondTest.success
    };
    
    const allSuccess = weeklyTest.success && monthlyTest.success && diamondTest.success;
    
    res.status(200).json({
      success: allSuccess,
      message: allSuccess ? 
        'All Telegram tests successful! Check your Telegram.' : 
        'Some tests failed',
      data: {
        botName: connectionTest.data?.result?.first_name,
        botUsername: connectionTest.data?.result?.username,
        testResults: allTests
      }
    });
    
  } catch (error) {
    console.error('Test Telegram error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// ✅ Test specific product type
router.post('/test-format', async (req, res) => {
  try {
    const { productType } = req.body; // 'weekly', 'monthly', 'diamond'
    
    if (!productType) {
      return res.status(400).json({
        success: false,
        message: 'Product type is required (weekly, monthly, or diamond)'
      });
    }
    
    let testData = {
      transactionId: productType.toUpperCase() + '_' + Date.now().toString().slice(-6),
      amount: 0,
      playerId: 'TEST' + Math.floor(Math.random() * 1000000),
      productName: '',
      diamonds: 0,
      productType: productType
    };
    
    // Set data based on product type
    switch(productType.toLowerCase()) {
      case 'weekly':
        testData.amount = 149;
        testData.productName = '1x weekly';
        testData.diamonds = 0;
        break;
      case 'monthly':
        testData.amount = 349;
        testData.productName = 'Monthly Membership';
        testData.diamonds = 0;
        break;
      case 'diamond':
        testData.amount = 185;
        testData.productName = '240 Diamond';
        testData.diamonds = 240;
        break;
      default:
        testData.amount = 100;
        testData.productName = 'Test Product';
        testData.diamonds = 50;
    }
    
    console.log(`\n📱 Testing ${productType} format...`);
    console.log('Test Data:', testData);
    
    // Send test message
    const result = await TelegramService.sendPaymentNotification(testData);
    
    res.status(200).json({
      success: result.success,
      message: result.success ? 
        `${productType} test message sent! Check Telegram.` : 
        `Failed to send ${productType} message`,
      testData: testData,
      error: result.error
    });
    
  } catch (error) {
    console.error('Test format error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

// ✅ Verify payment with formatted Telegram message
router.post('/verify', async (req, res) => {
  try {
    const { transactionId, amount, playerId, productId, productName, diamonds, price } = req.body;

    // Validation
    if (!transactionId || !amount || !playerId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID, Amount, Player ID and Product ID are required'
      });
    }

    // Check if transaction already exists
    const existingPayment = await Payment.findOne({ 
      transactionId: transactionId.toUpperCase() 
    });
    
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already exists'
      });
    }

    // Create new payment
    const payment = new Payment({
      transactionId: transactionId.toUpperCase(),
      amount: Number(amount),
      playerId,
      productId,
      productName: productName || 'Free Fire Diamond Pack',
      diamonds: diamonds || 0,
      price: price || amount,
      status: 'verified',
      verifiedAt: new Date()
    });

    await payment.save();

    // ✅ Detect product type for Telegram message
    let productType = 'other';
    const lowerProductName = (productName || '').toLowerCase();
    
    if (lowerProductName.includes('weekly') || lowerProductName.includes('1x')) {
      productType = 'weekly';
    } else if (lowerProductName.includes('monthly')) {
      productType = 'monthly';
    } else if (diamonds > 0) {
      productType = 'diamond';
    }
    
    console.log(`\n💰 New Payment Detected:`);
    console.log('Transaction:', transactionId);
    console.log('Amount:', amount);
    console.log('Player ID:', playerId);
    console.log('Product:', productName);
    console.log('Product Type:', productType);
    console.log('Diamonds:', diamonds);

    // ✅ Send formatted Telegram notification
    const telegramResult = await TelegramService.sendPaymentNotification({
      transactionId: payment.transactionId,
      amount: payment.amount,
      playerId: payment.playerId,
      productName: payment.productName,
      diamonds: payment.diamonds,
      productType: productType
    });

    // Update payment with Telegram info
    if (telegramResult.success && telegramResult.data) {
      payment.telegramNotification = true;
      payment.telegramMessageId = telegramResult.data.result?.message_id || '';
      await payment.save();
      
      console.log('✅ Telegram notification sent!');
    } else {
      console.log('❌ Telegram notification failed:', telegramResult.error);
    }

    res.status(201).json({
      success: true,
      message: 'Payment verified successfully!' + 
        (telegramResult.success ? ' Telegram notification sent.' : ''),
      data: {
        id: payment._id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        playerId: payment.playerId,
        productName: payment.productName,
        diamonds: payment.diamonds,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
        telegramSent: telegramResult.success,
        telegramMessageId: payment.telegramMessageId,
        productType: productType
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// ✅ Mark as delivered with Telegram
router.post('/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update status
    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    // ✅ Send delivery notification
    const telegramResult = await TelegramService.sendDeliveryNotification(
      payment.transactionId,
      payment.playerId,
      payment.productName
    );

    res.status(200).json({
      success: true,
      message: 'Order delivered!' + 
        (telegramResult.success ? ' Telegram notification sent.' : ''),
      data: payment
    });

  } catch (error) {
    console.error('Delivery update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status'
    });
  }
});

// ✅ Get all payments
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });
    
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

export default router;