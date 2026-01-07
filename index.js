const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")

// Function 1: Show Bot Info
function showBotInfo() {
  console.log("=".repeat(40))
  console.log("🤖 WHATSAPP BOT")
  console.log("📧 Email: Sky649957@gmail.com")
  console.log("📱 Number: +255748529340")
  console.log("=".repeat(40))
}

// Function 2: Handle QR Code
function handleQRCode(qr) {
  console.log("\n📱 SCAN THIS QR CODE:")
  console.log("1. Open WhatsApp")
  console.log("2. Settings → Linked Devices → Link a Device")
  console.log("3. Scan QR below:\n")
  qrcode.generate(qr, { small: true })
}

// Function 3: Handle Connection
function handleConnection(status) {
  if (status === "open") {
    console.log("\n✅ WHATSAPP CONNECTED!")
    console.log("📧 Sky649957@gmail.com")
    console.log("📱 +255748529340")
    console.log("🤖 Bot is now active")
  }
  
  if (status === "close") {
    console.log("🔄 Connection lost. Reconnecting...")
  }
}

// Function 4: Handle Messages
function handleMessage(sock, message) {
  const text = message.message?.conversation || ""
  
  if (text.toLowerCase() === "ping") {
    sock.sendMessage(message.key.remoteJid, { text: "🏓 pong!" })
  }
  
  if (text.toLowerCase() === "info") {
    sock.sendMessage(message.key.remoteJid, { 
      text: "🤖 WhatsApp Bot\n📧 Sky649957@gmail.com\n📱 +255748529340" 
    })
  }
}

// Function 5: Main Bot Function
async function startBot() {
  try {
    showBotInfo()
    
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    })
    
    sock.ev.on("connection.update", (update) => {
      if (update.qr) handleQRCode(update.qr)
      if (update.connection) handleConnection(update.connection)
    })
    
    sock.ev.on("creds.update", saveCreds)
    
    sock.ev.on("messages.upsert", ({ messages }) => {
      const msg = messages[0]
      if (!msg.key.fromMe && msg.message) {
        handleMessage(sock, msg)
      }
    })
    
  } catch (error) {
    console.error("❌ Error:", error.message)
    setTimeout(startBot, 10000)
  }
}

// Start Bot
startBot()
