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

// 3. تهيئة الذكاء الاصطناعي Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
let aiModel = null;

if (apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  aiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // الموديل المستقر والسريع
    systemInstruction: "أنت مساعد ذكاء اصطناعي ذكي وسريع داخل سيرفر ماينكرافت. أجب بدقة وبشكل مختصر ومباشر ومناسب لشات ماينكرافت."
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

  // 5. استقبال الأوامر والاستجابة عبر Gemini AI (يدعم رتب الشات والسيرفرات المعدلة)
  bot.on('messagestr', async (message) => {
    const match = message.match(/:\s*[gG]\s+(.+)$/) || message.match(/^[gG]\s+(.+)$/);

    if (match) {
      if (message.startsWith(bot.username) || message.includes(` ${bot.username}:`)) return;

      const prompt = match[1].trim();
      if (!prompt) return;

      if (!settings.gemini?.enabled) return;

      if (!aiModel) {
        bot.chat("⚠️ Gemini API Key غير مضاف في Render.");
        return;
      }

      // نظام مهلة (Cooldown 4 ثوانٍ) حمايةً للـ API
      const now = Date.now();
      if (now - lastRequestTime < 4000) {
        bot.chat("⚠️ يرجى الانتظار 4 ثوانٍ بين كل سؤال.");
        return;
      }
      lastRequestTime = now;

      try {
        const result = await aiModel.generateContent(prompt);
        const responseText = result.response.text().trim();

        sendChatMessage(bot, responseText);
      } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        
        let msg = error.message || "";
        if (msg.includes("403") || msg.includes("API key") || msg.includes("unregistered callers")) {
          msg = "403: مفتاح API غير صالح أو غير مضاف بشكل صحيح في Render";
        } else if (msg.includes("404")) {
          msg = "404: الموديل غير متاح";
        } else if (msg.includes("429")) {
          msg = "429: تم تجاوز الحد المسموح للطلبات";
        } else {
          msg = msg.split(':').pop().trim().slice(0, 70);
        }

        bot.chat(`❌ ${msg}`);
      }
    }
  });

  // إعادة الاتصال التلقائي عند قطع الاتصال
  bot.on('end', () => {
    console.log("🔄 تم قطع الاتصال، جاري إعادة الاتصال خلال 5 ثوانٍ...");
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.error("❌ Bot error:", err.message);
  });
}

// دالة تقسيم الرسائل الطويلة لتفادي الطرد أو التقطيع من السيرفر
function sendChatMessage(bot, text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let delay = 0;

  for (const line of lines) {
    // تقطيع الأسطر الطويلة لأجزاء بأقصى حد 200 حرف
    const chunks = line.match(/.{1,200}/g) || [line];
    for (const chunk of chunks) {
      setTimeout(() => {
        bot.chat(chunk);
      }, delay);
      delay += 1200; // تأخير 1.2 ثانية بين كل رسالة والأخرى
    }
  }
}

createBot();
