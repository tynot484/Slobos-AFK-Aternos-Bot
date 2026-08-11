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
أنت مساعد ذكاء اصطناعي ومرشد داخل سيرفر ماينكرافت.
1. اكتب دائماً بالدارجة التونسية بالفرنكو (Franco-Tunisian / Arabizi) واستخدم الأرقام (3=ع, 5=خ, 7=ح, 8=غ, 9=ق).
2. إجاباتك يجب أن تكون دقيقة، قصيرة، ومفيدة جداً بدون مقدمات طويلة.
3. أنت تعرف كل شيء عن السيرفر بناءً على هذه المعلومات:
- الأوامر الأساسية: /shop للبيع والشراء, /ah للمزاد, /rtp للانتقال العشوائي, /jobs للوظائف, /teams للفرق[cite: 2].
- الرتب (Ranks): VIP (0.99$), VIP+ (3.49$), MVP (6.99$), MVP+ (12.99$). كل رتبة تعطي خصائص مثل /hat, /enderchest, وأماكن بيوت (homes) إضافية[cite: 2, 3].
- حماية الأراضي: أوامر /ps مثل /ps add, /ps remove, /ps hide[cite: 2].
- منطقة الـ AFK: اللاعب يربح AFK Shards بنسبة 100%، أو 1000$ (25%)، أو طيران لـ 60 ثانية (10%). مسموح بحسابات غير محدودة هنا[cite: 3].
- الـ Wild Forge (الحداد): يبيع دروع وأسلحة قوية بأسعار بين 4 و 10 مليون دولار (مثل Wild Helmet بـ 5M، و Wild Elytra بـ 10M)[cite: 3].
- الصناديق (Crates): Diamond, Gold, Emerald, Vote, Monthly[cite: 3].
- الفعاليات: Pinata Party تبدأ بعد وصول السيرفر لـ 250 تصويت[cite: 3].
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
    // إيقاف فيزياء اللعبة لتقليل استهلاك الرام ومنع طرد البوت من الاستضافة
    bot.physicsEnabled = false; 
  });

  bot.on('messagestr', async (fullMessage) => {
    // تنظيف النص
    const cleanMsg = fullMessage
      .replace(/&#[0-9a-fA-F]{6}/gi, '')
      .replace(/&x(&[0-9a-fA-F]){6}/gi, '')
      .replace(/[&§][0-9a-fk-orA-FK-OR]/gi, '')
      .replace(/[|<>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanMsg.toLowerCase().includes(bot.username.toLowerCase())) return;

    let textToParse = cleanMsg;
    const colonIndex = cleanMsg.indexOf(':');
    if (colonIndex !== -1) {
      textToParse = cleanMsg.substring(colonIndex + 1).trim();
    }

    // البحث عن صيغة: اسم-سؤال (بدون مسافات حول الناقص)
    const match = textToParse.match(/^([a-zA-Z0-9_.]+)-(.+)$/i);
    if (!match) return;

    const sender = match[1].trim();
    let prompt = match[2].trim();

    if (sender.toLowerCase() === bot.username.toLowerCase()) return;
    if (prompt.length < 2) return;

    if (!aiModel) {
      bot.chat(`${sender} ❌ Gemini API mosh mawjoud!`);
      return;
    }

    // تقصير السؤال إذا كان طويلاً جداً لحماية السيرفر من الكراش (Tickhosting Limit)
    if (prompt.length > 250) {
      prompt = prompt.substring(0, 250);
    }

    // مانع السبام
    const now = Date.now();
    if (now - lastRequestTime < 4000) {
      return; // تجاهل الرد تماماً لتخفيف الضغط
    }
    lastRequestTime = now;

    console.log(`🎯 [طلب مقبول] المرسل: "${sender}" | السؤال: "${prompt}"`);
    
    // الرد المختصر الجديد
    bot.chat(`${sender} ⏳ la7dha bark...`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`🚀 [الأمر المنفذ]: /aibook ${sender} ${responseText}`);

      bot.chat(`/aibook ${sender} ${responseText}`);
      bot.chat(`${sender} 📖 Ba3athtlek ktab f inventory!`);

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`${sender} ❌ AI Error: mochkla sghira, 3awed.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
