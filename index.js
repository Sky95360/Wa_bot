const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")
const Pino = require("pino")
const qrcode = require("qrcode-terminal")
const fs = require("fs")

// Configuration - Use environment variables for production
const config = {
  phoneNumber: process.env.WHATSAPP_NUMBER || "+255748529340",
  email: process.env.BOT_EMAIL || "Sky649957@gmail.com",
  botName: process.env.BOT_NAME || "SkyBot",
  pairingEnabled: process.env.PAIRING_ENABLED === "true" || true
}

console.log(`🤖 Starting ${config.botName}...`)
console.log(`📧 Contact: ${config.email}`)

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
      logger: Pino({ level: "silent" }),
      auth: state,
      printQRInTerminal: false,
      browser: [config.botName, 'Chrome', '1.0.0'],
      markOnlineOnConnect: true
    })

    // QR Code Handler
    sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update
      
      // QR Code Display
      if (qr) {
        console.log("\n" + "=".repeat(40))
        console.log("📱 SCAN THIS QR CODE WITH WHATSAPP:")
        console.log("=".repeat(40) + "\n")
        qrcode.generate(qr, { small: true })
        console.log("\n" + "=".repeat(40))
        console.log("⏳ Waiting for QR scan...")
        console.log("💡 Go to WhatsApp > Settings > Linked Devices")
        console.log("=".repeat(40))
      }

      // Connection Status
      if (connection === "open") {
        console.log("\n✅ WHATSAPP CONNECTED SUCCESSFULLY!")
        console.log(`👤 User: ${sock.user?.name || "Unknown"}`)
        console.log(`📞 Number: ${sock.user?.id?.split(":")[0] || "Unknown"}`)
        console.log(`🤖 Bot Name: ${config.botName}`)
        
        // Send connection notification
        try {
          await sock.sendMessage(
            sock.user.id,
            { text: `✅ ${config.botName} is now online!\n📧 Contact: ${config.email}` }
          )
        } catch (e) {
          console.log("⚠️ Could not send connection notification")
        }
      }

      if (connection === "close") {
        const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
        console.log(`🔌 Connection closed. Reconnecting: ${shouldReconnect}`)
        
        if (shouldReconnect) {
          setTimeout(() => {
            console.log("🔄 Attempting to reconnect...")
            startBot()
          }, 5000)
        } else {
          console.log("❌ Logged out. Please delete 'auth' folder and rescan QR.")
        }
      }
    })

    // **PAIRING CODE FEATURE (Automatic)**
    sock.ev.once("connection.update", async (update) => {
      // Wait a bit before trying pairing code
      setTimeout(async () => {
        if (config.pairingEnabled && config.phoneNumber && !sock.authState.creds.registered) {
          console.log("\n" + "=".repeat(40))
          console.log("🔢 ATTEMPTING PAIRING CODE...")
          console.log(`📞 For number: ${config.phoneNumber}`)
          console.log("=".repeat(40))
          
          try {
            const code = await sock.requestPairingCode(config.phoneNumber)
            console.log(`\n🎉 PAIRING CODE GENERATED!`)
            console.log(`🔢 Code: ${code}`)
            console.log(`💡 Enter this code in WhatsApp:\n   Settings > Linked Devices > Link a Device`)
            console.log(`📞 For: ${config.phoneNumber}`)
            console.log("\n" + "=".repeat(40))
            
            // Save pairing info
            fs.writeFileSync("pairing-info.txt", 
              `Pairing Code: ${code}\nFor: ${config.phoneNumber}\nGenerated: ${new Date().toISOString()}`
            )
          } catch (e) {
            console.log("⚠️ Pairing code generation failed (normal for QR method):", e.message)
          }
        }
      }, 3000)
    })

    // Save credentials automatically
    sock.ev.on("creds.update", saveCreds)

    // Message Handler
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0]
      if (!msg.message || msg.key.fromMe) return

      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text ||
                   msg.message.imageMessage?.caption ||
                   ""

      const sender = msg.key.remoteJid
      const senderName = msg.pushName || "Unknown"

      console.log(`\n📩 New message from ${senderName}: ${text.substring(0, 50)}...`)

      // Commands
      if (text.toLowerCase() === "ping") {
        await sock.sendMessage(sender, { 
          text: `🏓 pong!\n⏰ ${new Date().toLocaleTimeString()}\n🤖 ${config.botName}` 
        })
      }
      
      if (text.toLowerCase() === "!info") {
        await sock.sendMessage(sender, {
          text: `🤖 *Bot Information*\n\n` +
                `*Name:* ${config.botName}\n` +
                `*Email:* ${config.email}\n` +
                `*Status:* Online ✅\n` +
                `*Uptime:* ${process.uptime().toFixed(0)}s\n` +
                `*Commands:* ping, !info, !help`
        })
      }
      
      if (text.toLowerCase() === "!help") {
        await sock.sendMessage(sender, {
          text: `📋 *Available Commands*\n\n` +
                `• *ping* - Test if bot is responsive\n` +
                `• *!info* - Get bot information\n` +
                `• *!help* - Show this help menu\n\n` +
                `📧 Contact: ${config.email}`
        })
      }
    })

    // Log errors
    sock.ev.on("connection.update", (update) => {
      if (update.error) {
        console.log("❌ Connection error:", update.error)
      }
    })

    console.log("\n" + "=".repeat(40))
    console.log("🤖 BOT STARTED SUCCESSFULLY")
    console.log("=".repeat(40))
    console.log("\nWaiting for authentication...")
    console.log("\nChoose ONE authentication method:")
    console.log("1. 📱 Scan QR Code (will appear above)")
    console.log("2. 🔢 Use Pairing Code (automatic if number is configured)")
    console.log("\n" + "=".repeat(40))

  } catch (error) {
    console.error("❌ Failed to start bot:", error)
    console.log("🔄 Restarting in 10 seconds...")
    setTimeout(startBot, 10000)
  }
}

// Handle process exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot gracefully...')
  process.exit(0)
})

startBot()
