const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const http = require('http')

const BOT_NUMBER = "+255748529340"
const BOT_EMAIL = "Sky649957@gmail.com"

console.log("=".repeat(60))
console.log("🤖 WHATSAPP BOT STARTING...")
console.log(`📧 ${BOT_EMAIL}`)
console.log(`📱 ${BOT_NUMBER}`)
console.log("=".repeat(60))

async function startWhatsAppBot() {
  try {
    // 1. Load authentication
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    
    // 2. Create WhatsApp connection
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Chrome', 'Windows', '10.0.0']
    })
    
    // 3. Show QR Code in logs
    sock.ev.on("connection.update", (update) => {
      const { qr, connection } = update
      
      if (qr) {
        console.log("\n" + "=".repeat(60))
        console.log("📱 SCAN THIS QR CODE WITH WHATSAPP:")
        console.log("=".repeat(60))
        qrcode.generate(qr, { small: true })
        console.log("\nOR use Pairing Code below")
        console.log("=".repeat(60))
      }
      
      if (connection === "open") {
        console.log("\n✅ WHATSAPP CONNECTED SUCCESSFULLY!")
        console.log(`👤 Connected as: ${sock.user?.name || "Bot"}`)
        console.log(`📱 Number: ${sock.user?.id?.split(':')[0] || BOT_NUMBER}`)
      }
    })
    
    // 4. Generate Pairing Code (6-DIGIT NUMERIC)
    setTimeout(async () => {
      try {
        console.log("\n⏳ Generating pairing code...")
        
        // IMPORTANT: Use correct phone format
        const cleanNumber = BOT_NUMBER.replace(/\D/g, '') // Remove non-digits
        const formattedNumber = cleanNumber.startsWith('255') ? `+${cleanNumber}` : BOT_NUMBER
        
        console.log(`📱 Requesting code for: ${formattedNumber}`)
        
        const code = await sock.requestPairingCode(formattedNumber)
        
        console.log("\n" + "=".repeat(60))
        console.log("🔢 PAIRING CODE GENERATED!")
        console.log("=".repeat(60))
        console.log(`📱 Phone: ${formattedNumber}`)
        console.log(`🔢 Code: ${code}`)
        console.log("\n📲 HOW TO USE:")
        console.log("1. Open WhatsApp on your phone")
        console.log("2. Go to Settings → Linked Devices")
        console.log("3. Tap 'Link a Device'")
        console.log("4. Choose 'Link with phone number'")
        console.log("5. Enter this 6-digit code: ", code)
        console.log("=".repeat(60))
        
      } catch (error) {
        console.log("⚠️ Pairing code failed. Use QR code above.")
      }
    }, 4000)
    
    // 5. Save session automatically
    sock.ev.on("creds.update", saveCreds)
    
    // 6. Handle messages
    sock.ev.on("messages.upsert", ({ messages }) => {
      const msg = messages[0]
      if (!msg.message || msg.key.fromMe) return
      
      const text = msg.message.conversation || ""
      const sender = msg.key.remoteJid
      
      if (text.toLowerCase() === "ping") {
        sock.sendMessage(sender, { text: "🏓 pong!" })
        console.log(`📤 Sent "pong" to ${sender}`)
      }
    })
    
  } catch (error) {
    console.error("❌ Bot error:", error.message)
    setTimeout(startWhatsAppBot, 10000)
  }
}

// 7. HTTP Server for Render
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: "online",
    bot: "WhatsApp Bot",
    email: BOT_EMAIL,
    number: BOT_NUMBER,
    timestamp: new Date().toISOString()
  }))
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`)
  startWhatsAppBot()
})

console.log("\n⏳ Bot starting up...")
