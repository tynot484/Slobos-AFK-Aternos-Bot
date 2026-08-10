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
3. قدم إجابة كاملة، مفصلة، ومنظمة جداً للمستخدم (النص سيتم تقسيمه على صفحات كتاب تلقائياً).
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
    console.log(`💬 [RAW CHAT]: "${fullMessage}"`);

    // 1. تنظيف الألوان والأكواد المخفية
    let cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/g, '')
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .trim();

    // تجاهل رسائل البوت نفسه
    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    // 2. البحث عن مكان النقطتين `:`
    const colonIndex = cleanMsg.indexOf(':');
    if (colonIndex === -1) return;

    const beforeColon = cleanMsg.substring(0, colonIndex).trim();
    const afterColon = cleanMsg.substring(colonIndex + 1).trim();

    // 3. التحقق من أن الرسالة تبدأ بـ g أو G ومسافة
    const matchG = afterColon.match(/^[gG]\s+(.+)$/i);
    if (!matchG) return;

    const prompt = matchG[1].trim();
    if (!prompt) return;

    // 4. جلب قائمة أسماء اللاعبين المتصلين بالكامل عبر bot.players
    const onlinePlayers = Object.keys(bot.players).filter(
      (name) => name.toLowerCase() !== bot.username.toLowerCase()
    );

    // 5. البحث عن أي اسم متصل موجود داخل النص الواقع قبل النقطتين
    let sender = onlinePlayers.find((playerName) => {
      // فحص وجود اسم اللاعب المتصل داخل النص
      const regex = new RegExp(`\\b${playerName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'i');
      return regex.test(beforeColon);
    });

    // احتياطي: إذا لم يتعرف عليه من القائمة لأي سبب، يأخذ الكلمة الأخيرة قبل النقطتين
    if (!sender) {
      const words = beforeColon.split(/\s+/).filter((w) => w.length > 0);
      const rawLastWord = words.pop();
      sender = rawLastWord ? rawLastWord.replace(/[^a-zA-Z0-9_.]/g, '') : null;
    }

    if (!sender || sender.length < 2) {
      console.log(`⚠️ لم يتم التعرف على مرسل الرسالة من قائمة اللاعبين المتصلين.`);
      return;
    }

    if (!aiModel) return;

    // مانع السبام (4 ثوانٍ بين كل سؤال)
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
      return;
    }
    lastRequestTime = now;

    console.log(`🎯 [لاعب متصل مؤكد]: "${sender}" | السؤال: "${prompt}"`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليكون سطر واحد مناسب لأمر ماينكرافت
      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`📤 تنفيذ الأمر: /aibook ${sender} ${responseText}`);

      // إرسال الكتاب وتنبيه اللاعب
      bot.chat(`/aibook ${sender} ${responseText}`);
      bot.chat(`@${sender} 📖 Ba3athtlek ktab f inventory fih l'ijaba kemla!`);
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);
      bot.chat(`@${sender} ❌ Sar moshkel fi el AI.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error('❌ Bot error:', err.message));
}

createBot();
