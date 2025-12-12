import express from 'express';
import Sms from '../models/Sms.js';

const router = express.Router();

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Receive SMS from React Native app or IFTTT
router.post('/receive', async (req, res) => {
  try {
    const { sender, message, timestamp, deviceId } = req.body;
    
    // Validate input
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        receivedData: req.body
      });
    }

    // Create new SMS record
    const newSms = new Sms({
      sender: sender || 'Unknown',
      message: message,
      timestamp: timestamp || new Date(),
      deviceId: deviceId || 'unknown-device',
      status: 'received',
      forwarded: false
    });

    // Save to database
    await newSms.save();

    console.log(`📱 [${new Date().toLocaleTimeString()}] SMS Received:`, {
      from: newSms.sender,
      message: newSms.message.substring(0, 100) + (newSms.message.length > 100 ? '...' : ''),
      device: newSms.deviceId,
      id: newSms._id
    });

    res.status(201).json({
      success: true,
      message: 'SMS received and stored successfully',
      data: {
        id: newSms._id,
        sender: newSms.sender,
        message: newSms.message,
        timestamp: newSms.timestamp,
        deviceId: newSms.deviceId,
        createdAt: newSms.createdAt
      },
      status: 'stored'
    });

  } catch (error) {
    console.error('❌ Error processing SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all SMS (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const { deviceId, sender, startDate, endDate, status } = req.query;
    
    // Build filter
    const filter = {};
    if (deviceId) filter.deviceId = deviceId;
    if (sender) filter.sender = { $regex: sender, $options: 'i' };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Get SMS with filters
    const smsList = await Sms.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Sms.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'SMS list retrieved successfully',
      count: smsList.length,
      total: total,
      pagination: {
        page: page,
        limit: limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      filters: filter,
      data: smsList
    });

  } catch (error) {
    console.error('❌ Error fetching SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS list',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get SMS by ID (FIXED with ObjectId validation)
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMS ID format. Must be a 24-character hex string.',
        receivedId: req.params.id,
        example: '507f1f77bcf86cd799439011'
      });
    }
    
    const sms = await Sms.findById(req.params.id);
    
    if (!sms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found with the given ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'SMS retrieved successfully',
      data: sms
    });

  } catch (error) {
    console.error('❌ Error fetching SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update SMS status (FIXED with ObjectId validation)
router.patch('/:id/status', async (req, res) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMS ID format'
      });
    }
    
    const { status, forwarded, notes } = req.body;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (forwarded !== undefined) {
      updateData.forwarded = forwarded;
      updateData.forwardedAt = forwarded ? new Date() : null;
    }
    if (notes) updateData.notes = notes;

    const updatedSms = await Sms.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'SMS status updated successfully',
      data: updatedSms
    });

  } catch (error) {
    console.error('❌ Error updating SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SMS status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// SMS Statistics
router.get('/stats/overview', async (req, res) => {
  try {
    // Total counts
    const totalSms = await Sms.countDocuments();
    const forwardedSms = await Sms.countDocuments({ forwarded: true });
    const failedSms = await Sms.countDocuments({ status: 'failed' });
    
    // Last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24Hours = await Sms.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });

    // Today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await Sms.countDocuments({
      createdAt: { $gte: todayStart }
    });

    // Group by device
    const byDevice = await Sms.aggregate([
      { 
        $group: { 
          _id: '$deviceId', 
          count: { $sum: 1 },
          lastMessage: { $max: '$createdAt' },
          firstMessage: { $min: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Group by sender (top 10)
    const bySender = await Sms.aggregate([
      { 
        $group: { 
          _id: '$sender', 
          count: { $sum: 1 },
          lastMessage: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Hourly distribution for last 24 hours
    const hourlyData = await Sms.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.status(200).json({
      success: true,
      message: 'SMS statistics retrieved successfully',
      data: {
        overview: {
          total: totalSms,
          forwarded: forwardedSms,
          failed: failedSms,
          pending: totalSms - forwardedSms - failedSms
        },
        timeBased: {
          last24Hours: last24Hours,
          today: todayCount,
          hourlyDistribution: hourlyData
        },
        grouping: {
          byDevice: byDevice,
          bySender: bySender
        },
        timestamps: {
          generatedAt: new Date().toISOString(),
          last24HoursStart: oneDayAgo.toISOString(),
          todayStart: todayStart.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search SMS
router.get('/search/text', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const results = await Sms.find({
      $or: [
        { message: { $regex: q, $options: 'i' } },
        { sender: { $regex: q, $options: 'i' } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    res.status(200).json({
      success: true,
      message: 'Search completed',
      query: q,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('❌ Error searching SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete SMS (FIXED with ObjectId validation)
router.delete('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid SMS ID format'
      });
    }
    
    const deletedSms = await Sms.findByIdAndDelete(req.params.id);
    
    if (!deletedSms) {
      return res.status(404).json({
        success: false,
        message: 'SMS not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'SMS deleted successfully',
      data: {
        id: deletedSms._id,
        sender: deletedSms.sender,
        message: deletedSms.message.substring(0, 50) + '...',
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error deleting SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Bulk delete (delete all) - USE WITH CAUTION
router.delete('/admin/clear-all', async (req, res) => {
  try {
    // For security, you might want to add authentication here
    const deletedCount = await Sms.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: 'All SMS cleared successfully',
      data: {
        deletedCount: deletedCount.deletedCount,
        clearedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error clearing SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear SMS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quick health check for SMS API
router.get('/health/check', async (req, res) => {
  try {
    const smsCount = await Sms.countDocuments();
    const latestSms = await Sms.findOne().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      message: 'SMS API is healthy',
      data: {
        totalSms: smsCount,
        latestSms: latestSms ? {
          id: latestSms._id,
          sender: latestSms.sender,
          message: latestSms.message.substring(0, 50) + '...',
          time: latestSms.createdAt
        } : null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SMS API health check failed',
      error: error.message
    });
  }
});

// Test endpoint to verify API is working
router.post('/test/receive', async (req, res) => {
  try {
    const testSms = new Sms({
      sender: '+88017' + Math.floor(Math.random() * 10000000),
      message: 'This is a test SMS from API',
      deviceId: 'test-api',
      status: 'received',
      forwarded: false
    });

    await testSms.save();

    res.status(201).json({
      success: true,
      message: 'Test SMS created successfully',
      data: {
        id: testSms._id,
        sender: testSms.sender,
        message: testSms.message,
        createdAt: testSms.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create test SMS',
      error: error.message
    });
  }
});

export default router;