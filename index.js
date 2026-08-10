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

// قائمة نصوص الرتب وأكواد الألوان المحددة الخاصة بك (يدعم & و §)
const RANK_PREFIX_PATTERNS = [
  /(?:&|§)#8DD9F5(?:&|§)lVIP\+\s+(?:&|§)#8DD9F5/gi,
  /(?:&|§)#7FDBAA(?:&|§)lVIP\s+(?:&|§)#7FDBAA/gi,
  /(?:&|§)#FAD967(?:&|§)lMVP\s+(?:&|§)#FAD967/gi,
  /(?:&|§)#E44A4A(?:&|§)lMVP\+\s+(?:&|§)#E44A4A/gi,
  /(?:&|§)7(?:&|§)lMEMBER\s+(?:&|§)7/gi,
  // الاحتياط للأسماء الصافية
  /MVP\+/gi, /VIP\+/gi, /MEMBER/gi, /VIP/gi, /MVP/gi
];

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
    // 1. البحث عن مكان النقطتين `:`
    const colonIndex = fullMessage.indexOf(':');
    if (colonIndex === -1) return;

    // فصل ما قبل النقطتين وما بعد النقطتين
    const beforeColon = fullMessage.substring(0, colonIndex);
    const afterColon = fullMessage.substring(colonIndex + 1).trim();

    // 2. التحقق من وجود g أو G ومسافة بعد النقطتين مباشرة
    const matchG = afterColon.match(/^[gG]\s+(.+)$/i);
    if (!matchG) return; // ليس سؤالاً موجهاً للبوت

    const prompt = matchG[1].trim(); // استخراج السؤال
    if (!prompt) return;

    // 3. حذف كتابات الرتب المحددة من الجزء الواقع قبل النقطتين
    let cleanBefore = beforeColon;
    for (const pattern of RANK_PREFIX_PATTERNS) {
      cleanBefore = cleanBefore.replace(pattern, '');
    }

    // تنظيف أي رموز ألوان أو أقواس متبقية
    cleanBefore = cleanBefore
      .replace(/&#[0-9a-fA-F]{6}/gi, '')
      .replace(/§#[0-9a-fA-F]{6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .trim();

    // 4. استخراج اسم اللاعب النهائي الصافي (بدون النقطتين)
    const nameMatch = cleanBefore.match(/[a-zA-Z0-9_.]+/);
    const sender = nameMatch ? nameMatch[0] : null;

    if (!sender || sender.length < 2 || sender.toLowerCase() === bot.username.toLowerCase()) {
      console.log(`⚠️ تعذر استخراج اسم صالح من النص: "${beforeColon}"`);
      return;
    }

    if (!aiModel) return;

    // مانع السبام (4 ثوانٍ بين الأسئلة)
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
      return;
    }
    lastRequestTime = now;

    console.log(`🎯 [اللاعب]: "${sender}" | [السؤال]: "${prompt}"`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليكون سطر واحد خالي من الأسطر الجديدة لضمان تنفيذ الكومند
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
