const express = require('express');
const mineflayer = require('mineflayer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// 1. تحميل الإعدادات من settings.json
let settings = {};
try {
  settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
} catch (err) {
  console.error('❌ فشل في قراءة settings.json:', err.message);
}

// 2. إعداد خادم الويب (Express) لـ Render
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

// 3. تهيئة Gemini AI
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
let aiModel = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: `
أنت مساعد ذكاء اصطناعي داخل سيرفر ماينكرافت (Java & Bedrock).
إجابتك ستظهر داخل كتاب (Written Book):
1. اكتب دائماً بالدارجة التونسية بالفرنكو (Franco-Tunisian / Arabizi) لتعمل لدى لاعبي البيدروك والجافا دون مشاكل أحرف مقلوبة.
2. استخدم الأرقام للأحرف (3=ع, 5=خ, 7=ح, 8=غ, 9=ق).
3. اجعل الإجابة مقتضبة ومباشرة ومناسبة لصفحة كتاب في ماينكرافت.
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي Gemini بنجاح!");
} else {
  console.warn("⚠️ لم يتم العثور على GEMINI_API_KEY في متغيرات البيئة!");
}

let lastRequestTime = 0;

// 4. إنشاء وتشغيل البوت
function createBot() {
  const bot = mineflayer.createBot({
    host: settings.server?.ip || 'localhost',
    port: settings.server?.port || 25565,
    username: settings['bot-account']?.username || 'AFK_Bot',
    password: settings['bot-account']?.password || undefined,
    version: settings.server?.version || false,
    auth: settings['bot-account']?.type === 'microsoft' ? 'microsoft' : 'offline'
  });

  bot.on('spawn', () => {
    console.log(`✅ دخل البوت إلى السيرفر باسم: ${bot.username}`);

    if (settings.utils?.['auto-auth']?.enabled) {
      const pass = settings.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/register ${pass} ${pass}`);
        bot.chat(`/login ${pass}`);
      }, 2000);
    }
  });

  setInterval(() => {
    if (bot && settings.movement?.['random-jump']?.enabled) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, settings.movement?.['random-jump']?.interval || 30000);

  // 5. استقبال الأسئلة وتحديد اسم السائل مهما كانت رتبته
  bot.on('messagestr', async (message) => {
    // تجاهل رسائل البوت نفسه
    if (message.startsWith(bot.username) || message.includes(` ${bot.username}:`)) return;

    // نمط يتخطى أي رتبة (MEMBER, VIP, VIP+, MVP, MVP+) ويستخرج اسم اللاعب مباشرة قبل : أو >
    const match = message.match(/(?:.*?\b)?([a-zA-Z0-9_]{3,16})\s*[:>]\s*[gG]\s+(.+)$/i);

    if (match) {
      const sender = match[1];
      const prompt = match[2]?.trim();

      if (!prompt || !sender) return;
      if (!settings.gemini?.enabled) return;

      if (!aiModel) {
        bot.chat("⚠️ Gemini API Key غير مضاف في Render.");
        return;
      }

      const now = Date.now();
      if (now - lastRequestTime < 4000) {
        bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
        return;
      }
      lastRequestTime = now;

      try {
        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        // إرسال الكتاب مباشرة للاعب
        sendAnswerInBook(bot, sender, responseText);
        
        // إرسال إشعار في الشات
        bot.chat(`@${sender} 📖 Ba3athtlek ktab fih el ijaba f inventory mta3ek!`);

      } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        bot.chat(`@${sender} ❌ Sar moshkel fi el AI.`);
      }
    }
  });

  bot.on('end', () => {
    console.log("🔄 تم قطع الاتصال، جاري إعادة الاتصال خلال 5 ثوانٍ...");
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.error("❌ Bot error:", err.message);
  });
}

// دالة تنظيف النص وإعطاء الكتاب عبر أمر /give
function sendAnswerInBook(bot, username, answerText) {
  if (!username) return;

  const cleanText = answerText
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

  const giveCommand = `/give ${username} written_book{title:"Reponse AI",author:"Gemini",pages=['{"text":"${cleanText}"}']} 1`;
  bot.chat(giveCommand);
}

createBot();
