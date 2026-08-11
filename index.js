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
أنت مرشد ذكي ومحترم داخل سيرفر ماينكرافت.

التعليمات القاطعة والصارمة:
1. يمنع منعاً باتاً وأبديداً استخدام أي لفظ بذيء أو شتم أو كلام غير محترم. كن محترماً ومهدباً دائماً.
2. اكتب **فقط** بالدارجة التونسية بحروف لاتينية (Franco / Arabizi). يمنع منعاً باتاً كتابة أي حرف عربي أبجدياً (أ، ب، ت، إلخ) حتى لا يتشوه الكتاب داخل اللعبة.
3. أجب **فقط وبدقة** على ما يُسأل عنه دون زيادة، ودون عرض خدمات، ودون اقتراح أوامر أو مواضيع أخرى.
4. اجعل الإجابات مختصرة ومباشرة، ولا تطيل إلا إذا طلب اللاعب شرحاً مفصلاً.
5. تنسيق الرسم والتصميم (Crafting Table Grid):
   عندما يسألك اللاعب عن طريقة صناعة غرض ما (Crafting)، ارسم له جدول الكرافتينغ 3x3 داخل النص بشكل منظم جداً ومفهوم هكذا:
   [ Wood ] [ Wood ] [ Wood ]
   [ Air  ] [ Stick] [ Air  ]
   [ Air  ] [ Stick] [ Air  ]
   واستخدم أسماء المواد بالإنجليزية لسهولة الفهم (مثل Iron, Diamond, Wood, Stick, Paper).

6. التنظيم وإكمال الأفكار:
   لا تقطع الجملة في منتصفها أبداً. أنهِ المعلومة أو الخطوة بشكل كامل ومفهوم. إذا كانت الإجابة جزيئية ولها بقية، أنهِ الجزء بعبارة: "Theb nkamel?" فقط دون إعطاء تعليمات للاعب حول ماذا يكتب.

7. معجم اللهجة التونسية النقية (Arabizi):
   - استخدم: chnowa, kifech, 3lech, win, wa9tech, barcha, chwaya, behi, mrigal, fama, mafamech, a3mel, emchi.
   - تجنب العبارات المترجمة حرفياً اجعل كلامك تونسياً حقيقياً ونظيفاً.

معلومات السيرفر (للإجابة عند السؤال فقط):
- /shop, /ah, /rtp, /jobs, /teams.
- Ranks: VIP, VIP+, MVP, MVP+.
- Claiming: /ps add, /ps remove, /ps hide.
- AFK Area: 100% AFK Shards, 25% $1000, 10% Fly 60s.
- Wild Forge: Ultra weapons/armor (4M-10M).
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي بنظام القواعد الصارمة والتنسيق البصري!");
} else {
  console.error("❌ لم يتم العثور على GEMINI_API_KEY في البيئة!");
}

let lastRequestTime = 0;
const pendingResponses = new Map();

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
    bot.physicsEnabled = false; 
  });

  bot.on('messagestr', async (fullMessage) => {
    // تنظيف النص القادم من السيرفر
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

    const match = textToParse.match(/^([a-zA-Z0-9_.]+)-(.+)$/i);
    if (!match) return;

    const sender = match[1].trim();
    let prompt = match[2].trim();
    const lowerSender = sender.toLowerCase();

    if (lowerSender === bot.username.toLowerCase()) return;
    if (prompt.length < 1) return;

    // استقبال المتابعة
    const continuationWords = ['ey', 'kamel', 'kemmel', 'oui', 'yes', '1', 'zida', 'zid', 'nkamel', 'ok'];

    if (pendingResponses.has(lowerSender) && continuationWords.includes(prompt.toLowerCase())) {
      const chunks = pendingResponses.get(lowerSender);
      const nextChunk = chunks.shift();

      bot.chat(`/aibook ${sender} ${nextChunk}`);

      if (chunks.length === 0) {
        pendingResponses.delete(lowerSender);
      }
      return;
    }

    if (!aiModel) return;

    if (prompt.length > 250) {
      prompt = prompt.substring(0, 250);
    }

    const now = Date.now();
    if (now - lastRequestTime < 3000) return;
    lastRequestTime = now;

    console.log(`🎯 [طلب جديد] المرسل: "${sender}" | السؤال: "${prompt}"`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      // فلترة صارمة: إزالة أي حروف عربية قد تسبب تشوهاً في كتاب ماينكرافت
      responseText = responseText.replace(/[\u0600-\u06FF]/g, '');
      
      // تنظيف الأسطر والرموز المربكة
      responseText = responseText.replace(/\r?\n/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ');

      // تقطيع النص إلى أجزاء عند نهاية الجمل وليس وسط الكلمات
      const MAX_CHUNK_LENGTH = 180;
      const chunks = [];
      
      if (responseText.length <= MAX_CHUNK_LENGTH) {
        chunks.push(responseText);
      } else {
        let words = responseText.split(' ');
        let currentChunk = '';

        for (let word of words) {
          if ((currentChunk + ' ' + word).length > MAX_CHUNK_LENGTH) {
            chunks.push(currentChunk.trim());
            currentChunk = word;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word;
          }
        }
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
      }

      // إضافة "Theb nkamel?" لنهاية الأجزاء الأولى إذا كان هناك بقية
      for (let i = 0; i < chunks.length - 1; i++) {
        chunks[i] = chunks[i] + ' ... Theb nkamel?';
      }

      const firstChunk = chunks.shift();
      bot.chat(`/aibook ${sender} ${firstChunk}`);

      if (chunks.length > 0) {
        pendingResponses.set(lowerSender, chunks);
      } else {
        pendingResponses.delete(lowerSender);
      }

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`${sender} ❌ Fama mochkla sghira, 3awed jarreb.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
