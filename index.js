const express = require('express');
const mineflayer = require('mineflayer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
} catch (err) {
  console.error('❌ فشل في قراءة settings.json:', err.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('AFK Bot with Gemini AI is active!');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {});
  }, 10 * 60 * 1000);
}

const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
let aiModel = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: `
أنت مساعد ذكاء اصطناعي داخل سيرفر ماينكرافت.
1. اكتب دائماً بالدارجة التونسية بالفرنكو (Franco-Tunisian / Arabizi).
2. استخدم الأرقام للأحرف (3=ع, 5=خ, 7=ح, 8=غ, 9=ق).
3. قدم إجابة كاملة ومفصلة.
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي Gemini بنجاح!");
} else {
  console.error("❌ لم يتم العثور على GEMINI_API_KEY في البيئة!");
}

let lastRequestTime = 0;

function createBot() {
  const bot = mineflayer.createBot({
    host: settings.server?.ip || 'localhost',
    port: settings.server?.port || 25565,
    username: settings['bot-account']?.username || 'Ana_Maradhon',
    password: settings['bot-account']?.password || undefined,
    version: settings.server?.version || false,
    auth: settings['bot-account']?.type === 'microsoft' ? 'microsoft' : 'offline'
  });

  bot.on('spawn', () => {
    console.log(`✅ دخل البوت إلى السيرفر باسم: ${bot.username}`);
  });

  bot.on('messagestr', async (fullMessage) => {
    // 1. تنظيف النص من الألوان والأقواس والرموز
    const cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/gi, '')
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .replace(/[|<>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // تجاهل رسائل البوت نفسه
    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    let sender = null;
    let prompt = null;

    // الصيغة الأولى: الشات العادي (MEMBER tosty: g hi)
    const colonIndex = cleanMsg.indexOf(':');
    if (colonIndex !== -1) {
      const beforeColon = cleanMsg.substring(0, colonIndex).trim();
      const afterColon = cleanMsg.substring(colonIndex + 1).trim();

      const matchG = afterColon.match(/^[gG]\s+(.+)$/i);
      if (matchG) {
        prompt = matchG[1].trim();
        const words = beforeColon.split(' ').filter(w => w.length > 0);
        const rawName = words.pop();
        sender = rawName ? rawName.replace(/[^a-zA-Z0-9_.]/g, '') : null;
      }
    } 

    // الصيغة الثانية: كتابة الاسم المباشرة (tosty g hi)
    if (!prompt) {
      const explicitMatch = cleanMsg.match(/\b([a-zA-Z0-9_.]+)\s+[gG]\s+(.+)$/i);
      if (explicitMatch) {
        sender = explicitMatch[1].trim();
        prompt = explicitMatch[2].trim();
      }
    }

    if (!sender || sender.length < 2 || !prompt) return;
    if (sender.toLowerCase() === bot.username.toLowerCase()) return;

    if (!aiModel) {
      bot.chat(`${sender} ❌ GEMINI_API_KEY mosh mawjoud f Render!`);
      return;
    }

    // مانع السبام (4 ثوانٍ بين الأسئلة)
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      bot.chat(`${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
      return;
    }
    lastRequestTime = now;

    console.log(`🎯 [طلب مقبول] المرسل: "${sender}" | السؤال: "${prompt}"`);
    bot.chat(`${sender} ⏳ Ja3li njawbek...`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليكون سطر واحد خالي من الأسطر الجديدة والاقتباسات
      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`🚀 [الأمر المنفذ]: /aibook ${sender} ${responseText}`);

      // إرسال الأمر وتنبيه اللاعب بدون الـ @
      bot.chat(`/aibook ${sender} ${responseText}`);
      bot.chat(`${sender} 📖 Ba3athtlek ktab f inventory!`);

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`${sender} ❌ AI Error: ${error.message.substring(0, 40)}`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
