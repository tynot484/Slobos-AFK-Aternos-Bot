const express = require('express');
const mineflayer = require('mineflayer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// 1. تحميل الإعدادات من ملف settings.json
let settings = {};
try {
  settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
} catch (err) {
  console.error('❌ فشل في قراءة settings.json:', err.message);
}

// 2. إعداد خادم الويب (Express) للحفاظ على تشغيل البوت في Render
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('AFK Bot with Gemini AI is active!');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// إرسال Ping تلقائي لإبقاء الخدمة نشطة في Render
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(process.env.RENDER_EXTERNAL_URL).catch(() => {});
  }, 10 * 60 * 1000); // كل 10 دقائق
}

// 3. تهيئة الذكاء الاصطناعي Gemini AI مع تعليمات الفرنكو-تونسي (Arabizi)
const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;
let aiModel = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  aiModel = genAI.getGenerativeModel({
    model: "gemini-3.5-flash-lite",
    systemInstruction: `
أنت مساعد ذكاء اصطناعي داخل سيرفر ماينكرافت.
قواعد مهمة جداً يجب اتباعها دائماً:
1. يمنع منعاً باتاً استخدام الحروف العربية (لأن الشات يعرضها مقلوبة).
2. يجب أن تجيب دائماً بالدارجة التونسية المكتوبة بالحروف والارقام اللاتينية (Franco-Tunisian / Arabizi).
3. التزم بهذه الأرقام للأحرف العربية:
   - 3 = ع (مثال: 3aslama, 3lik)
   - 4 أو dh = ذ
   - 5 أو kh = خ (مثال: 5ater, khir)
   - 7 = ح (مثال: 7amdoullah, 7aja)
   - 8 أو gh = غ (مثال: 8ali)
   - 9 = ق (مثال: 9alb)
4. اجعل الإجابات قصيرة ومباشرة ومناسبة لشات ماينكرافت (مثال: "3aslama labes 3lik kifech n3awnok?").
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي Gemini بنجاح!");
} else {
  console.warn("⚠️ لم يتم العثور على GEMINI_API_KEY في متغيرات البيئة!");
}

// متغير لحفظ وقت آخر طلب لمنع استنزاف الكوتا (Cooldown)
let lastRequestTime = 0;

// 4. إنشاء وتشغيل بوت ماينكرافت
function createBot() {
  const bot = mineflayer.createBot({
    host: settings.server?.ip || 'localhost',
    port: settings.server?.port || 25565,
    username: settings['bot-account']?.username || 'AFK_Bot',
    password: settings['bot-account']?.password || undefined,
    version: settings.server?.version || false,
    auth: settings['bot-account']?.type === 'microsoft' ? 'microsoft' : 'offline'
  });

  // عند الدخول للسيرفر
  bot.on('spawn', () => {
    console.log(`✅ دخل البوت إلى السيرفر باسم: ${bot.username}`);

    // تسجيل الدخول التلقائي
    if (settings.utils?.['auto-auth']?.enabled) {
      const pass = settings.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/register ${pass} ${pass}`);
        bot.chat(`/login ${pass}`);
      }, 2000);
    }
  });

  // نظام Anti-AFK (قفز عشوائي لمنع الطرد)
  setInterval(() => {
    if (bot && settings.movement?.['random-jump']?.enabled) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, settings.movement?.['random-jump']?.interval || 30000);

  // 5. استقبال الأوامر والاستجابة بالفرنكو مع توجيه الرد للسائل مباشرة
  bot.on('messagestr', async (message) => {
    if (message.startsWith(bot.username) || message.includes(` ${bot.username}:`)) return;

    // استخراج اسم اللاعب والسؤال
    const match = message.match(/(?:(?:\[.*?\]\s*|<)?([a-zA-Z0-9_]{3,16})>?\s*[:>]\s*)?[gG]\s+(.+)$/i);

    if (match) {
      const sender = match[1] || null;
      const prompt = match[2]?.trim();

      if (!prompt) return;
      if (!settings.gemini?.enabled) return;

      if (!aiModel) {
        bot.chat("⚠️ Gemini API Key غير مضاف في Render.");
        return;
      }

      // نظام مهلة (Cooldown 4 ثوانٍ)
      const now = Date.now();
      if (now - lastRequestTime < 4000) {
        const warningMsg = "⚠️ Stanna 4 thawani bin kol so2al.";
        bot.chat(sender ? `@${sender} ${warningMsg}` : warningMsg);
        return;
      }
      lastRequestTime = now;

      try {
        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        // إرسال الإجابة بالفرنكو في الشات مباشرة مع ذكر اسم السائل
        sendChatMessage(bot, responseText, sender);

        // إذا أردت إعطاء كتاب للسائل أيضاً (يلزم البوت أن يكون OP)، قم بإلغاء التهميش عن السطر التالي:
        // sendAnswerInBook(bot, sender, responseText);

      } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        
        let msg = error.message || "";
        if (msg.includes("403") || msg.includes("API key") || msg.includes("unregistered callers")) {
          msg = "403: El key mouch sa7i7 fi Render";
        } else if (msg.includes("404")) {
          msg = "404: El model mouch mawjoud";
        } else if (msg.includes("429")) {
          msg = "429: Fathat el quota mta3el API";
        } else {
          msg = msg.split(':').pop().trim().slice(0, 70);
        }

        bot.chat(sender ? `@${sender} ❌ ${msg}` : `❌ ${msg}`);
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

// دالة تقسيم الرسائل وإرسالها للسائل بالفرنكو
function sendChatMessage(bot, text, targetUser = null) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let delay = 0;
  let isFirstChunk = true;

  for (const line of lines) {
    const chunks = line.match(/.{1,200}/g) || [line];
    for (let chunk of chunks) {
      if (isFirstChunk && targetUser) {
        chunk = `@${targetUser} ${chunk}`;
        isFirstChunk = false;
      }

      setTimeout(() => {
        bot.chat(chunk);
      }, delay);
      delay += 1200;
    }
  }
}

// دالة إرسال كتاب للاعب تحتوي على الإجابة (تُستخدم فقط إذا كان لدى البوت صلاحيات /give)
function sendAnswerInBook(bot, username, answerText) {
  if (!username) return;
  const cleanText = answerText.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const giveCommand = `/give ${username} written_book{title:"Réponse AI",author:"Bot",pages=['{"text":"${cleanText}"}']} 1`;
  bot.chat(giveCommand);
}

createBot();
