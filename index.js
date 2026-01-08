const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');

// Bot Configuration
const BOT_CONFIG = {
  name: 'SkyBot',
  number: '+255748529340',
  email: 'Sky649957@gmail.com',
  version: '1.0.0'
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logger
const logger = Pino({
  level: 'info',
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

// Function to display beautiful QR code
function displayQRCode(qr) {
  console.clear();
  console.log('\n' + '═'.repeat(60));
  console.log('🤖 WHATSAPP BOT - AUTHENTICATION REQUIRED');
  console.log('═'.repeat(60));
  console.log(`📧 Email: ${BOT_CONFIG.email}`);
  console.log(`📱 Number: ${BOT_CONFIG.number}`);
  console.log(`🤖 Name: ${BOT_CONFIG.name}`);
  console.log('═'.repeat(60));
  console.log('\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
  console.log('═'.repeat(60) + '\n');
  
  // Generate QR code with better visibility
  qrcode.generate(qr, {
    small: true,
    scale: 2
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('📲 HOW TO SCAN:');
  console.log('1. Open WhatsApp on your phone');
  console.log('2. Tap Menu (⋮) or Settings');
  console.log('3. Tap Linked Devices');
  console.log('4. Tap Link a Device');
  console.log('5. Tap Scan QR Code');
  console.log('6. Point your camera at this QR code');
  console.log('═'.repeat(60));
  console.log('\n⏳ Waiting for scan... (This QR is valid for 45 seconds)');
}

// Function to save connection info
function saveConnectionInfo(user) {
  const connectionInfo = {
    connectedAt: new Date().toISOString(),
    botName: BOT_CONFIG.name,
    botNumber: BOT_CONFIG.number,
    botEmail: BOT_CONFIG.email,
    user: {
      id: user?.id || 'Unknown',
      name: user?.name || 'Unknown',
      phone: user?.id?.split(':')[0] || BOT_CONFIG.number
    }
  };
  
  try {
    fs.writeFileSync(
      path.join(logsDir, 'connection-info.json'),
      JSON.stringify(connectionInfo, null, 2)
    );
    logger.info('Connection info saved successfully');
  } catch (error) {
    logger.error('Failed to save connection info:', error);
  }
}

// Main bot function
async function startBot() {
  try {
    console.log('\n' + '✨'.repeat(30));
    console.log('🚀 STARTING WHATSAPP BOT');
    console.log('✨'.repeat(30));
    console.log(`🤖 Bot Name: ${BOT_CONFIG.name}`);
    console.log(`📧 Contact: ${BOT_CONFIG.email}`);
    console.log(`📱 Number: ${BOT_CONFIG.number}`);
    console.log(`🕒 Started: ${new Date().toLocaleString()}`);
    console.log('✨'.repeat(30));
    
    // Initialize authentication state
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    logger.info('Authentication state loaded');
    
    // Create WhatsApp socket
    const sock = makeWASocket({
      auth: state,
      logger: Pino({ level: 'silent' }), // Silent logger for cleaner output
      printQRInTerminal: false, // We handle QR display manually
      browser: [BOT_CONFIG.name, 'Chrome', '120.0.0.0'],
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: true,
      defaultQueryTimeoutMs: 60000,
      transactionOpts: {
        maxCommitRetries: 10,
        delayBetweenTriesMs: 3000
      }
    });
    
    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Display QR code when available
      if (qr) {
        displayQRCode(qr);
      }
      
      // Handle successful connection
      if (connection === 'open') {
        console.log('\n' + '✅'.repeat(25));
        console.log('🎉 WHATSAPP CONNECTED SUCCESSFULLY!');
        console.log('✅'.repeat(25));
        console.log(`👤 Connected as: ${sock.user?.name || 'Bot User'}`);
        console.log(`📱 Phone: ${sock.user?.id?.split(':')[0] || BOT_CONFIG.number}`);
        console.log(`🆔 User ID: ${sock.user?.id || 'Unknown'}`);
        console.log(`📅 Connected at: ${new Date().toLocaleString()}`);
        console.log('✅'.repeat(25));
        
        // Save connection info
        saveConnectionInfo(sock.user);
        
        // Send welcome message to yourself
        try {
          await sock.sendMessage(sock.user.id, {
            text: `✅ *${BOT_CONFIG.name} is now online!*\n\n` +
                  `📧 *Email:* ${BOT_CONFIG.email}\n` +
                  `📱 *Number:* ${BOT_CONFIG.number}\n` +
                  `🕒 *Connected:* ${new Date().toLocaleTimeString()}\n` +
                  `🤖 *Status:* Active and ready!\n\n` +
                  `Type "help" for commands.`
          });
          console.log('📨 Welcome message sent to bot owner');
        } catch (error) {
          console.log('⚠️ Could not send welcome message:', error.message);
        }
      }
      
      // Handle connection closure
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('\n' + '⚠️'.repeat(25));
        console.log('🔌 CONNECTION CLOSED');
        console.log('⚠️'.repeat(25));
        console.log(`📊 Status Code: ${statusCode || 'Unknown'}`);
        console.log(`🔄 Reconnecting: ${shouldReconnect ? 'YES' : 'NO'}`);
        console.log(`⏰ Time: ${new Date().toLocaleString()}`);
        console.log('⚠️'.repeat(25));
        
        if (shouldReconnect) {
          console.log('\n🔄 Attempting to reconnect in 5 seconds...');
          setTimeout(() => {
            console.log('🚀 Restarting bot...');
            startBot();
          }, 5000);
        } else {
          console.log('\n❌ Logged out. Please delete "auth" folder and rescan QR code.');
          console.log('💡 To restart: Delete "auth" folder and run "npm start" again.');
        }
      }
    });
    
    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      
      // Ignore if no message or message is from bot
      if (!msg.message || msg.key.fromMe) return;
      
      // Extract message text
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption || 
                   '';
      
      const sender = msg.key.remoteJid;
      const senderName = msg.pushName || 'Unknown';
      
      // Log received message
      console.log(`\n📩 New message from ${senderName}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Command handlers
      const command = text.toLowerCase().trim();
      
      switch (command) {
        case 'ping':
          await sock.sendMessage(sender, { 
            text: `🏓 Pong!\n⏰ ${new Date().toLocaleTimeString()}\n🤖 ${BOT_CONFIG.name}` 
          });
          console.log(`✅ Replied "pong" to ${senderName}`);
          break;
          
        case 'info':
          await sock.sendMessage(sender, {
            text: `🤖 *${BOT_CONFIG.name} - Bot Information*\n\n` +
                  `📧 *Email:* ${BOT_CONFIG.email}\n` +
                  `📱 *Number:* ${BOT_CONFIG.number}\n` +
                  `🆔 *Version:* ${BOT_CONFIG.version}\n` +
                  `✅ *Status:* Online and active\n` +
                  `⏰ *Uptime:* ${process.uptime().toFixed(0)} seconds\n` +
                  `📅 *Server Time:* ${new Date().toLocaleString()}\n\n` +
                  `Type "help" for available commands.`
          });
          console.log(`✅ Sent bot info to ${senderName}`);
          break;
          
        case 'help':
          await sock.sendMessage(sender, {
            text: `📋 *${BOT_CONFIG.name} - Available Commands*\n\n` +
                  `• *ping* - Check if bot is responsive\n` +
                  `• *info* - Get bot information\n` +
                  `• *help* - Show this help menu\n` +
                  `• *time* - Get current server time\n\n` +
                  `📧 *Contact:* ${BOT_CONFIG.email}\n` +
                  `📱 *Support:* ${BOT_CONFIG.number}`
          });
          console.log(`✅ Sent help menu to ${senderName}`);
          break;
          
        case 'time':
          await sock.sendMessage(sender, {
            text: `🕒 *Current Server Time:*\n${new Date().toLocaleString()}`
          });
          console.log(`✅ Sent time to ${senderName}`);
          break;
          
        default:
          // Auto-reply for unknown commands
          if (text && !text.startsWith('!') && !text.startsWith('/')) {
            await sock.sendMessage(sender, {
              text: `Hello ${senderName}! 👋\n\n` +
                    `I'm ${BOT_CONFIG.name}, a WhatsApp bot.\n` +
                    `📧 Contact: ${BOT_CONFIG.email}\n\n` +
                    `Type "help" to see what I can do!`
            });
            console.log(`✅ Sent greeting to ${senderName}`);
          }
          break;
      }
    });
    
    // Handle connection errors
    sock.ev.on('connection.update', (update) => {
      if (update.error) {
        console.log('\n❌ Connection Error:', update.error);
        logger.error('Connection error:', update.error);
      }
    });
    
    console.log('\n' + '🔧'.repeat(30));
    console.log('🤖 BOT INITIALIZATION COMPLETE');
    console.log('🔧'.repeat(30));
    console.log('\n📋 Next Steps:');
    console.log('1. A QR code will appear above');
    console.log('2. Scan it with WhatsApp within 45 seconds');
    console.log('3. Bot will connect automatically');
    console.log('4. Send "ping" to test the bot');
    console.log('\n' + '🔧'.repeat(30));
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    logger.error('Critical error in startBot:', error);
    
    console.log('\n🔄 Restarting bot in 10 seconds...');
    setTimeout(() => {
      console.log('🚀 Attempting to restart...');
      startBot();
    }, 10000);
  }
}

// Start the bot
startBot();

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down bot gracefully...');
  console.log('📅 Shutdown time:', new Date().toLocaleString());
  console.log('✅ Goodbye!');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n⚠️ Uncaught Exception:', error);
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled rejection:', reason);
});
