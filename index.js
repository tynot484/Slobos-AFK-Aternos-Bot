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

  bot.on('messagestr', async (rawMessage) => {
    // 1. تنظيف الرسالة من رموز ألوان ماينكرافت المخفية (مثل §7 أو §f)
    const cleanMsg = rawMessage.replace(/[\u00A7§][0-9a-fk-or]/gi, '').trim();

    // 2. المطابقة بحسب فكرتك:
    // الكلمة الأخيرة قبل النقطتين `:` أو `>` تكون اسم اللاعب (من 3 إلى 16 حرف)
    // وتكون متبوعة بـ g أو G ومسافة، ثم السؤال.
    const match = cleanMsg.match(/(?:^|\s|\])([a-zA-Z0-9_]{3,16})\s*[:>]\s*[gG]\s+(.+)$/i);

    if (match) {
      const sender = match[1];         // اسم اللاعب الصافي (مثل tosty)
      const prompt = match[2]?.trim(); // السؤال الصافي (مثل hi)

      // تجاهل الرسالة إذا كانت من البوت نفسه أو بدون سؤال
      if (!prompt || !sender || sender.toLowerCase() === bot.username.toLowerCase()) return;
      if (!settings.gemini?.enabled || !aiModel) return;

      const now = Date.now();
      if (now - lastRequestTime < 4000) {
        bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
        return;
      }
      lastRequestTime = now;

      console.log(`📩 سؤال مالي من [${sender}]: ${prompt}`);

      try {
        const result = await aiModel.generateContent(prompt);
        let responseText = result.response.text().trim();

        // تنظيف النص من الأسطر الجديدة والرموز التعبيرية التي قد تعطل أمر /aibook
        responseText = responseText.replace(/\r?\n|\r/g, " ").replace(/"/g, "'");

        // إرسال الأمر بالصيغة المطلوبة
        bot.chat(`/aibook ${sender} ${responseText}`);
        
        // تنبيه اللاعب في الشات
        bot.chat(`@${sender} 📖 Ba3athtlek ktab f inventory fih l'ijaba kemla!`);

      } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        bot.chat(`@${sender} ❌ Sar moshkel fi el AI.`);
      }
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
