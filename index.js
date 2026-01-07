const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")
const Pino = require("pino")
const qrcode = require("qrcode-terminal")
const readline = require("readline")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")

  const sock = makeWASocket({
    logger: Pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false // QR handled manually below
  })

  // Show QR in terminal for Render / local
  sock.ev.on("connection.update", (update) => {
    if (update.qr) {
      console.log("\nScan this QR with WhatsApp:\n")
      qrcode.generate(update.qr, { small: true })
    }

    if (update.connection === "close") {
      console.log("Connection closed, reconnecting...")
      startBot()
    }

    if (update.connection === "open") {
      console.log("✅ WhatsApp connected!")
    }
  })

  // Pairing code fallback (local use)
  if (!sock.authState.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question("Enter WhatsApp number with country code (for pairing code, optional): ", async (number) => {
      if (number.trim()) {
        try {
          const code = await sock.requestPairingCode(number.trim())
          console.log("\nPAIRING CODE (local use only):", code)
        } catch (e) {
          console.log("Error generating pairing code:", e)
        }
      }
      rl.close()
    })
  }

  // Save session automatically
  sock.ev.on("creds.update", saveCreds)

  // Auto-reply test
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (text === "ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "pong ✅ Bot is working" })
    }
  })
}

startBot()
