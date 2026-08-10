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

// قائمة جميع الرتب للتحقق منها وتصفيتها
const KNOWN_RANKS = ['MVP+', 'VIP+', 'MEMBER', 'VIP', 'MVP', 'ADMIN', 'OWNER', 'DEFAULT'];

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

  setInterval(() => {
    if (bot && settings.movement?.['random-jump']?.enabled) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, settings.movement?.['random-jump']?.interval || 30000);

  bot.on('messagestr', async (fullMessage) => {
    // 1. تنظيف شامل وأولي لأي ألوان وهيكس (HEX) وأكواد ماينكرافت المخفية
    const cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/g, '')          // ألوان HEX الحديثة
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')      // ألوان HEX الكلاسيكية
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')  // ألوان ماينكرافت العادية
      .trim();

    // تجاهل رسائل البوت نفسه
    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    // 2. التحقق الذكي الصارم: يجب أن تحتوي الرسالة على (: g ) أو (: G ) ومسافة
    // إذا لم يتحقق الشرط، يخرج البوت مباشرة دون استهلاك أي معالجة
    const triggerMatch = cleanMsg.match(/:\s*[gG]\s+(.+)$/i);
    if (!triggerMatch) return; 

    const prompt = triggerMatch[1].trim(); // استخراج السؤال الصافي
    if (!prompt) return;

    // 3. تحليل وشق النص لمعرفة اسم اللاعب بناءً على الرتبة
    const colonIndex = cleanMsg.indexOf(':');
    let beforeColon = cleanMsg.substring(0, colonIndex).trim();

    // فحص الرتبة وحذفها من النص
    for (const rank of KNOWN_RANKS) {
      if (beforeColon.toUpperCase().includes(rank.toUpperCase())) {
        const rankRegex = new RegExp(rank.replace('+', '\\+'), 'gi');
        beforeColon = beforeColon.replace(rankRegex, '').trim();
        break;
      }
    }

    // 4. استخراج اسم اللاعب الصافي المطابق لمواصفات ماينكرافت (3-16 حرف/رقم)
    const validNames = beforeColon.match(/[a-zA-Z0-9_]{3,16}/g);
    const sender = validNames ? validNames.pop() : null;

    if (!sender || sender.toLowerCase() === bot.username.toLowerCase()) return;
    if (!aiModel) return;

    // مانع السبام (4 ثوانٍ بين كل سؤال)
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      bot.chat(`@${sender} ⚠️ Stanna 4 thawani bin kol so2al.`);
      return;
    }
    lastRequestTime = now;

    console.log(`🎯 [طلب مقبول] اللاعب: "${sender}" | السؤال: "${prompt}"`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // تنظيف النص لضمان عدم تخريب أمر /aibook بسبب الأسطر الجديدة أو الاقتباسات
      responseText = responseText.replace(/\r?\n|\r/g, " ").replace(/"/g, "'");

      // تنفيذ الأمر المخصص وتنبيه اللاعب
      bot.chat(`/aibook ${sender} ${responseText}`);
      bot.chat(`@${sender} 📖 Ba3athtlek ktab f inventory fih l'ijaba kemla!`);

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`@${sender} ❌ Sar moshkel fi el AI.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
