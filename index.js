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
    model: "gemini-2.5-flash-lite",
    systemInstruction: `
أنت مساعد ذكاء اصطناعي داخل سيرفر ماينكرافت.
1. اكتب دائماً بالدارجة التونسية بالفرنكو (Franco-Tunisian / Arabizi).
2. استخدم الأرقام للأحرف (3=ع, 5=خ, 7=ح, 8=غ, 9=ق).
3. قدم إجابة كاملة، مفصلة، ومنظمة جداً للمستخدم.
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي Gemini بنجاح!");
} else {
  console.error("❌ لم يتم العثور على GEMINI_API_KEY!");
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
    console.log(`💬 [شات خام]: "${fullMessage}"`);

    // 1. تنظيف الألوان والرموز الغريبة للحفاظ على سلامة النص
    const cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/gi, '')
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .replace(/[|<>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // تجاهل رسائل البوت نفسه
    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    // 2. الفحص بالصيغة الجديدة: (الاسم) ثم (g أو G) ثم (السؤال)
    // مثال: tosty g hi  أو  B_tosty G kifash nasna3 saif
    const match = cleanMsg.match(/\b([a-zA-Z0-9_.]+)\s+[gG]\s+(.+)$/i);
    if (!match) return; // إذا لم تكن الصيغة متطابقة يتجاهل الرسالة

    const sender = match[1].trim(); // اسم اللاعب المستخرج
    const prompt = match[2].trim(); // السؤال المستخرج

    if (!sender || sender.length < 2 || !prompt) return;
    if (sender.toLowerCase() === bot.username.toLowerCase()) return;

    if (!aiModel) {
      console.error("❌ مفتاح Gemini API غير متصل!");
      return;
    }

    // مانع السبام (4 ثوانٍ بين الأسئلة)
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
      return;
    }
    lastRequestTime = now;

    console.log(`🎯 [طلب ناجح] اللاعب: "${sender}" | السؤال: "${prompt}"`);

    // إرسال رد سريع في الشات لتأكيد الاستلام
    bot.chat(`@${sender} ⏳ Ja3li njawbek...`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليصبح سطر واحد مناسب لأمر ماينكرافت
      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`🚀 [الأمر المنفذ]: /aibook ${sender} ${responseText}`);

      // إرسال الكتاب وتنبيه اللاعب
      bot.chat(`/aibook ${sender} ${responseText}`);
      bot.chat(`@${sender} 📖 Ba3athtlek ktab f inventory!`);

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`@${sender} ❌ Sar moshkel fi el AI.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
