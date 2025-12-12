import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://robotopup.vercel.app', 
    'http://localhost:3000',
    'http://localhost:8081', // React Native dev server
    'http://10.0.2.2:8081' // Android emulator
  ],
  credentials: true
}));
app.use(express.json({
  strict: false,
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.log('Raw buffer (first 200 chars):', buf.toString().substring(0, 200));
      console.log('JSON parse error:', e.message);
      // Don't throw, just continue
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Import routes
import paymentRoutes from './routes/paymentRoutes.js';
import productRoutes from './routes/productRoutes.js';
import telegramWebhook from './routes/telegramWebhook.js';
import smsRoutes from './routes/smsRoutes.js'; // ✅ নতুন SMS routes

// Database connection
import connectDB from './utils/database.js';
connectDB();

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/telegram', telegramWebhook);
app.use('/api/sms', smsRoutes); // ✅ SMS routes যোগ করুন

// Health check - updated with SMS info
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Robo TopUp API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      payments: '/api/payments',
      products: '/api/products',
      telegram: '/api/telegram',
      sms: {
        receive: '/api/sms/receive',
        list: '/api/sms',
        stats: '/api/sms/stats/overview'
      }
    },
    environment: process.env.NODE_ENV || 'development'
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

// SMS test endpoint (for quick testing)
app.get('/api/sms/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SMS API is working',
    endpoints: {
      receiveSMS: 'POST /api/sms/receive',
      getSMS: 'GET /api/sms',
      getStats: 'GET /api/sms/stats/overview'
    },
    exampleRequest: {
      method: 'POST',
      url: '/api/sms/receive',
      body: {
        sender: '+8801712345678',
        message: 'Your OTP is 123456',
        deviceId: 'android-phone-1'
      }
    }
  });
});

// SMS Dashboard (for monitoring)
app.get('/sms-dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>📱 SMS Forwarder Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .dashboard-container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #2196F3 0%, #0d47a1 100%);
                color: white;
                padding: 30px 40px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 1.1rem;
                opacity: 0.9;
            }
            
            .main-content {
                padding: 30px 40px;
            }
            
            .api-section {
                background: #f8f9fa;
                padding: 25px;
                border-radius: 10px;
                margin-bottom: 30px;
                border-left: 5px solid #2196F3;
            }
            
            .api-section h2 {
                color: #2196F3;
                margin-bottom: 20px;
                font-size: 1.8rem;
            }
            
            .endpoint {
                background: white;
                padding: 20px;
                margin-bottom: 15px;
                border-radius: 8px;
                border: 1px solid #e0e0e0;
            }
            
            .method {
                display: inline-block;
                padding: 5px 12px;
                border-radius: 4px;
                font-weight: bold;
                margin-right: 10px;
                font-size: 0.9rem;
            }
            
            .method.post { background: #4CAF50; color: white; }
            .method.get { background: #2196F3; color: white; }
            
            .url {
                font-family: monospace;
                color: #333;
                font-size: 1.1rem;
            }
            
            .description {
                margin-top: 10px;
                color: #666;
                line-height: 1.6;
            }
            
            .code-block {
                background: #2d2d2d;
                color: #f8f8f2;
                padding: 20px;
                border-radius: 8px;
                margin-top: 15px;
                font-family: 'Courier New', monospace;
                font-size: 0.95rem;
                overflow-x: auto;
            }
            
            .test-area {
                background: #e3f2fd;
                padding: 25px;
                border-radius: 10px;
                margin-top: 30px;
            }
            
            .test-area h3 {
                color: #1565c0;
                margin-bottom: 20px;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            label {
                display: block;
                margin-bottom: 5px;
                color: #333;
                font-weight: 500;
            }
            
            input, textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 1rem;
                transition: border 0.3s;
            }
            
            input:focus, textarea:focus {
                border-color: #2196F3;
                outline: none;
            }
            
            button {
                background: linear-gradient(135deg, #2196F3 0%, #0d47a1 100%);
                color: white;
                border: none;
                padding: 14px 28px;
                border-radius: 6px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
            }
            
            .response-area {
                margin-top: 20px;
                padding: 15px;
                background: white;
                border-radius: 6px;
                border: 2px solid #2196F3;
                min-height: 100px;
                font-family: monospace;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                border-top: 1px solid #eee;
                font-size: 0.9rem;
            }
            
            @media (max-width: 768px) {
                .main-content {
                    padding: 20px;
                }
                
                .header h1 {
                    font-size: 2rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="header">
                <h1>📱 SMS Forwarder Dashboard</h1>
                <p>Robo TopUp SMS Management System</p>
            </div>
            
            <div class="main-content">
                <div class="api-section">
                    <h2>API Endpoints</h2>
                    
                    <div class="endpoint">
                        <div>
                            <span class="method post">POST</span>
                            <span class="url">/api/sms/receive</span>
                        </div>
                        <div class="description">
                            Receive SMS from React Native app or other sources.
                        </div>
                    </div>
                    
                    <div class="endpoint">
                        <div>
                            <span class="method get">GET</span>
                            <span class="url">/api/sms</span>
                        </div>
                        <div class="description">
                            Get all SMS with pagination. Parameters: ?page=1&limit=20
                        </div>
                    </div>
                    
                    <div class="endpoint">
                        <div>
                            <span class="method get">GET</span>
                            <span class="url">/api/sms/stats/overview</span>
                        </div>
                        <div class="description">
                            Get SMS statistics - total count, by device, last 24 hours, etc.
                        </div>
                    </div>
                    
                    <div class="code-block">
// React Native Example:
const forwardSMS = async () => {
  const response = await fetch('${req.protocol}://${req.get('host')}/api/sms/receive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: '+8801712345678',
      message: 'Your OTP is 123456',
      deviceId: 'android-phone-1',
      timestamp: new Date().toISOString()
    })
  });
  return await response.json();
};
                    </div>
                </div>
                
                <div class="test-area">
                    <h3>Test SMS API</h3>
                    <form id="smsTestForm">
                        <div class="form-group">
                            <label for="sender">Sender Number:</label>
                            <input type="text" id="sender" value="+8801712345678" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="message">Message:</label>
                            <textarea id="message" rows="4" required>This is a test SMS message from dashboard</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="deviceId">Device ID:</label>
                            <input type="text" id="deviceId" value="web-dashboard" required>
                        </div>
                        
                        <button type="submit">Send Test SMS</button>
                    </form>
                    
                    <div id="response" class="response-area">
                        Response will appear here...
                    </div>
                </div>
            </div>
            
            <div class="footer">
                Robo TopUp SMS Forwarder • ${new Date().getFullYear()}
            </div>
        </div>
        
        <script>
            document.getElementById('smsTestForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const sender = document.getElementById('sender').value;
                const message = document.getElementById('message').value;
                const deviceId = document.getElementById('deviceId').value;
                
                const responseDiv = document.getElementById('response');
                responseDiv.innerHTML = 'Sending...';
                
                try {
                    const response = await fetch('/api/sms/receive', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            sender: sender,
                            message: message,
                            deviceId: deviceId,
                            timestamp: new Date().toISOString()
                        })
                    });
                    
                    const data = await response.json();
                    responseDiv.innerHTML = JSON.stringify(data, null, 2);
                    
                } catch (error) {
                    responseDiv.innerHTML = 'Error: ' + error.message;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: {
      health: '/api/health',
      sms: '/api/sms/receive',
      telegram: '/api/telegram/webhook',
      payments: '/api/payments',
      products: '/api/products',
      dashboard: '/sms-dashboard'
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
    ┌─────────────────────────────────────────────────────────────┐
    │                                                             │
    │  🚀 Robo TopUp Server v2.0                                  │
    │  📡 SMS Forwarder Feature Added                             │
    │                                                             │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │  🔗 API Base URL: http://localhost:${PORT}                    │
    │                                                             │
    │  📱 SMS Endpoints:                                          │
    │     • Receive SMS: POST /api/sms/receive                    │
    │     • List SMS:    GET /api/sms                             │
    │     • Stats:       GET /api/sms/stats/overview              │
    │                                                             │
    │  🤖 Telegram Webhook: http://localhost:${PORT}/api/telegram/webhook │
    │                                                             │
    │  📊 SMS Dashboard: http://localhost:${PORT}/sms-dashboard     │
    │                                                             │
    │  🩺 Health Check: http://localhost:${PORT}/api/health        │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
  `);
});