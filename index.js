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

// إعدادات رموز القص لكل رتبة بناءً على ملفات LuckPerms
const RANK_RULES = [
  { rank: 'MVP+',  markers: ['&#E44A4A', '§#E44A4A', '&E44A4A'] },
  { rank: 'VIP+',   markers: ['&#8DD9F5', '§#8DD9F5', '&8DD9F5'] },
  { rank: 'MEMBER', markers: ['&7', '§7'] },
  { rank: 'VIP',    markers: ['&#7FDBAA', '§#7FDBAA', '&7FDBAA'] },
  { rank: 'MVP',    markers: ['&#FAD967', '§#FAD967', '&FAD967'] }
];

function extractSenderName(beforeColon) {
  for (const rule of RANK_RULES) {
    if (beforeColon.toUpperCase().includes(rule.rank)) {
      // البحث عن آخر كود لون خاص بهذه الرتبة
      for (const marker of rule.markers) {
        const index = beforeColon.lastIndexOf(marker);
        if (index !== -1) {
          // حذف الكود وكل ما يقع قبله
          const rawAfter = beforeColon.substring(index + marker.length);
          // تنظيف ما تبقى للحصول على اسم ماينكرافت الصافي
          const match = rawAfter.match(/[a-zA-Z0-9_.]+/);
          if (match) return match[0];
        }
      }
      // إذا لم يجد رمز اللون بشكل صريح، يقطع من بعد اسم الرتبة مباشرة
      const rankIdx = beforeColon.toUpperCase().lastIndexOf(rule.rank);
      const rawAfterRank = beforeColon.substring(rankIdx + rule.rank.length);
      const match = rawAfterRank.match(/[a-zA-Z0-9_.]+/);
      if (match) return match[0];
    }
  }

  // خيار احتياطي طارئ
  const clean = beforeColon.replace(/(§.|&[0-9a-fk-or#]|&#[0-9a-fA-F]{6})/gi, '').trim();
  const lastWord = clean.split(/\s+/).pop();
  return lastWord ? lastWord.replace(/[^a-zA-Z0-9_.]/g, '') : null;
}

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

    const beforeColon = fullMessage.substring(0, colonIndex);
    const afterColon = fullMessage.substring(colonIndex + 1).trim();

    // 2. الشرط: أن تبدأ الرسالة بـ g أو G ومسافة بعد النقطتين
    const matchG = afterColon.match(/^[gG]\s+(.+)$/i);
    if (!matchG) return;

    const prompt = matchG[1].trim();
    if (!prompt) return;

    // 3. استخراج اسم اللاعب بحذف الرتبة والرمز وكل ما قبلهما
    const sender = extractSenderName(beforeColon);

    if (!sender || sender.length < 2 || sender.toLowerCase() === bot.username.toLowerCase()) {
      console.log(`⚠️ لم يتم استخراج اسم صالح من النص: "${beforeColon}"`);
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

    console.log(`🎯 [اللاعب المكتشف]: "${sender}" | [السؤال]: "${prompt}"`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص ليكون سطر واحد مناسب لأمر ماينكرافت
      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`🚀 [تنفيذ الأمر]: /aibook ${sender} ${responseText}`);

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
