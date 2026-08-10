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
3. اجعل الإجابة مفيدة وواضحة ولا تتجاوز 180 حرفاً لكي تلائم أمر الكتاب في ماينكرافت.
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
    // 1. تنظيف ألوان وأكواد ماينكرافت الهيكس والأقواس
    let cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/g, '')
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .replace(/[<>[\]()]/g, ' ')
      .trim();

    // تجاهل رسائل البوت نفسه
    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    // 2. البحث عن النقطتين `:`
    const colonIndex = cleanMsg.indexOf(':');
    if (colonIndex === -1) return;

    const beforeColon = cleanMsg.substring(0, colonIndex).trim();
    const afterColon = cleanMsg.substring(colonIndex + 1).trim();

    // 3. التحقق من وجود حرف g أو G متبوعاً بمسافة بعد النقطتين
    const matchG = afterColon.match(/^[gG]\s+(.+)$/i);
    if (!matchG) return;

    const prompt = matchG[1].trim();
    if (!prompt) return;

    // 4. استخراج اسم اللاعب مباشرة (الكلمة الأخيرة قبل النقطتين)
    const words = beforeColon.split(/\s+/).filter((w) => w.length > 0);
    const rawLastWord = words.pop();
    const sender = rawLastWord ? rawLastWord.replace(/[^a-zA-Z0-9_.]/g, '') : null;

    console.log(`🔍 [تحليل الرسالة] المرسل: "${sender}" | السؤال: "${prompt}"`);

    if (!sender || sender.length < 2 || sender.toLowerCase() === bot.username.toLowerCase()) {
      console.log(`⚠️ اسم المرسل غير صالح: "${sender}"`);
      return;
    }

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

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليكون سطر واحد خالي من الأسطر الجديدة والاقتباسات
      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      // قص النص إذا تجاوز 200 حرف لضمان عدم تجاوز حد أومار ماينكرافت (256 حرف)
      if (responseText.length > 200) {
        responseText = responseText.substring(0, 197) + '...';
      }

      console.log(`📤 إرسال الأمر: /aibook ${sender} ${responseText}`);

      // إرسال الكتاب وتنبيه اللاعب في الشات
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
