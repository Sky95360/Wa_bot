const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")

const BOT_NUMBER = "+255748529340"
const BOT_EMAIL = "Sky649957@gmail.com"

// Function 1: Show Info
function showInfo() {
  console.log("=".repeat(50))
  console.log("🤖 WHATSAPP BOT")
  console.log(`📧 ${BOT_EMAIL}`)
  console.log(`📱 ${BOT_NUMBER}`)
  console.log("=".repeat(50))
}

// Function 2: Show QR
function showQR(qr) {
  console.log("\n" + "=".repeat(50))
  console.log("📱 QR CODE:")
  qrcode.generate(qr, { small: true })
  console.log("=".repeat(50))
}

// Function 3: Get Pairing Code
async function getPairingCode(sock) {
  try {
    const code = await sock.requestPairingCode(BOT_NUMBER)
    console.log("\n" + "=".repeat(50))
    console.log("🔢 PAIRING CODE:")
    console.log(`📱 For: ${BOT_NUMBER}`)
    console.log(`🔢 Code: ${code}`)
    console.log("=".repeat(50))
    return code
  } catch (e) {
    console.log("⚠️ Pairing code error")
    return null
  }
}

// Function 4: Handle Connection
function handleConnection(sock, update) {
  const { connection } = update
  
  if (connection === "open") {
    console.log("\n✅ CONNECTED!")
  }
  
  if (connection === "close") {
    console.log("🔄 Reconnecting...")
    setTimeout(startBot, 5000)
  }
}

// Function 5: Main Bot
async function startBot() {
  try {
    showInfo()
    
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    })
    
    sock.ev.on("connection.update", async (update) => {
      if (update.qr) showQR(update.qr)
      handleConnection(sock, update)
      
      // Get pairing code
      if (update.qr) {
        setTimeout(async () => {
          const code = await getPairingCode(sock)
          if (code) {
            console.log(`\n💡 Enter code ${code} in WhatsApp:`)
            console.log("Settings → Linked Devices → Link a Device → Link with phone number")
          }
        }, 3000)
      }
    })
    
    sock.ev.on("creds.update", saveCreds)
    
    sock.ev.on("messages.upsert", ({ messages }) => {
      const msg = messages[0]
      if (!msg.message || msg.key.fromMe) return
      
      const text = msg.message.conversation || ""
      const sender = msg.key.remoteJid
      
      if (text === "ping") {
        sock.sendMessage(sender, { text: "🏓 pong!" })
      }
    })
    
  } catch (error) {
    console.error("Error:", error.message)
    setTimeout(startBot, 10000)
  }
}

// Add this HTTP server for Render
const http = require('http')
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end('<h1>WhatsApp Bot is Running</h1><p>📱 +255748529340<br>📧 Sky649957@gmail.com</p>')
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`)
  // Start bot after server is ready
  startBot()
})
