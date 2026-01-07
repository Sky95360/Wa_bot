const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")

const BOT_NUMBER = "+255748529340"
const BOT_EMAIL = "Sky649957@gmail.com"

// Function 1: Show Info
function showInfo() {
  console.log("=".repeat(50))
  console.log("🤖 WHATSAPP BOT WITH PAIRING CODE")
  console.log(`📧 ${BOT_EMAIL}`)
  console.log(`📱 ${BOT_NUMBER}`)
  console.log("=".repeat(50))
}

// Function 2: Show QR
function showQR(qr) {
  console.log("\n" + "=".repeat(50))
  console.log("📱 QR CODE METHOD:")
  qrcode.generate(qr, { small: true })
  console.log("Scan this QR in WhatsApp")
  console.log("=".repeat(50))
}

// Function 3: Get Pairing Code
async function getPairingCode(sock) {
  try {
    const code = await sock.requestPairingCode(BOT_NUMBER)
    console.log("\n" + "=".repeat(50))
    console.log("🔢 PAIRING CODE METHOD:")
    console.log(`📱 For: ${BOT_NUMBER}`)
    console.log(`🔢 Code: ${code}`)
    console.log("\nHow to use:")
    console.log("1. Open WhatsApp")
    console.log("2. Settings → Linked Devices")
    console.log("3. Tap 'Link a Device'")
    console.log("4. Choose 'Link with phone number'")
    console.log("5. Enter this code")
    console.log("=".repeat(50))
  } catch (e) {
    console.log("⚠️ Pairing code not available, use QR")
  }
}

// Function 4: Handle Connection
function handleConnection(sock, update) {
  const { connection } = update
  
  if (connection === "open") {
    console.log("\n✅ CONNECTED!")
    console.log(`📧 ${BOT_EMAIL}`)
    console.log(`📱 ${BOT_NUMBER}`)
    
    // Auto-send welcome message
    try {
      sock.sendMessage(sock.user.id, {
        text: `✅ Bot Connected!\n📧 ${BOT_EMAIL}\n📱 ${BOT_NUMBER}`
      })
    } catch (e) {}
  }
  
  if (connection === "close") {
    console.log("🔄 Reconnecting...")
    setTimeout(startBot, 5000)
  }
}

// Function 5: Save Creds
function saveCredsFunction(saveCreds) {
  return (creds) => saveCreds(creds)
}

// Function 6: Handle Messages
function handleMessages(sock) {
  return ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    
    const text = msg.message.conversation || ""
    const sender = msg.key.remoteJid
    
    if (text === "ping") {
      sock.sendMessage(sender, { text: "🏓 pong!" })
    }
    
    if (text === "pairing") {
      getPairingCode(sock).then(code => {
        sock.sendMessage(sender, {
          text: `🔢 Pairing Code for ${BOT_NUMBER}:\n\n${code || "Use QR method"}`
        })
      })
    }
    
    if (text === "info") {
      sock.sendMessage(sender, {
        text: `🤖 WhatsApp Bot\n📧 ${BOT_EMAIL}\n📱 ${BOT_NUMBER}\n✅ Online`
      })
    }
  }
}

// Function 7: Main Bot
async function startBot() {
  try {
    showInfo()
    
    const { state, saveCreds } = await useMultiFileAuthState("auth")
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    })
    
    sock.ev.on("connection.update", (update) => {
      if (update.qr) showQR(update.qr)
      handleConnection(sock, update)
      
      // Try pairing code after 3 seconds
      if (update.qr) {
        setTimeout(() => getPairingCode(sock), 3000)
      }
    })
    
    sock.ev.on("creds.update", saveCredsFunction(saveCreds))
    sock.ev.on("messages.upsert", handleMessages(sock))
    
  } catch (error) {
    console.error("❌ Error:", error.message)
    setTimeout(startBot, 10000)
  }
}

// Start
startBot()
