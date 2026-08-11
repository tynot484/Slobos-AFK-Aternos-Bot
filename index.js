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
أنت بوت في سيرفر ماينكرافت. 
القواعد الأساسية الصارمة:
1. أجب **فقط** على ما يسأله اللاعب. لا تقترح أبداً أشياء لم يطلبها، لا تقل "هل تريد معرفة كذا؟"، لا ترحب به، ولا تعرض خدماتك. ادخل في صلب الموضوع مباشرة.
2. كن مبدعاً ومفصلاً. إذا سألك قصة أو شرح طويل، خذ راحتك في الإطالة (حتى لو كانت الإجابة طويلة جداً).
3. تحدث **فقط** باللهجة التونسية الدارجة بحروف لاتينية (Franco / Arabizi). 
4. لتحسين لغتك التونسية، استخدم هذه المصطلحات بشكل طبيعي: 
   - chnowa (ماذا) / kifech (كيف) / 3lech (لماذا) / wa9tech (متى) / win (أين)
   - barcha (كثيراً) / chwaya (قليلاً) / behi (جيد) / 5ayeb (سيء)
   - bech (سوف/لكي) / ey (نعم) / le (لا) / fama (يوجد) / mafamech (لا يوجد)
   - a3mel (افعل) / emchi (اذهب) / ija (تعال)
   - تجنب الترجمة الحرفية من العربية الفصحى، اجعل كلامك يبدو كشاب تونسي يلعب ماينكرافت.
5. معلومات السيرفر التي تعرفها للإجابة عليها (فقط إذا سُئلت):
   - /shop (بيع وشراء), /ah (مزاد), /rtp (انتقال عشوائي), /jobs (وظائف), /teams (فرق).
   - الرتب: VIP, VIP+, MVP, MVP+.
   - حماية الأراضي: /ps add, /ps remove, /ps hide.
   - منطقة AFK: تربح AFK Shards بنسبة 100%، أو 1000$ (25%)، أو طيران 60 ثانية (10%). مسموح تعدد الحسابات.
   - الحداد (Wild Forge): أسلحة ودروع قوية بأسعار 4-10 مليون.
   - الصناديق: Diamond, Gold, Emerald, Vote, Monthly.
   - الفعاليات: Pinata Party (بعد 250 تصويت).
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي بنجاح مع تحسينات اللهجة التونسية!");
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
    bot.physicsEnabled = false; 
  });

  bot.on('messagestr', async (fullMessage) => {
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

    if (sender.toLowerCase() === bot.username.toLowerCase()) return;
    if (prompt.length < 2) return;

    if (!aiModel) return;

    if (prompt.length > 250) {
      prompt = prompt.substring(0, 250);
    }

    const now = Date.now();
    if (now - lastRequestTime < 4000) return;
    lastRequestTime = now;

    console.log(`🎯 [طلب مقبول] المرسل: "${sender}" | السؤال: "${prompt}"`);
    
    bot.chat(`${sender} ⏳ la7dha bark...`);

    try {
      const result = await aiModel.generateContent(prompt);
      let responseText = result.response.text().trim();

      responseText = responseText.replace(/\r?\n|\r/g, ' ').replace(/"/g, "'");

      console.log(`🚀 [يتم إرسال الكتاب إلى]: ${sender}`);

      // إرسال الأمر للسيرفر لصناعة الكتاب فقط دون إخبار اللاعب في الشات
      bot.chat(`/aibook ${sender} ${responseText}`);

    } catch (error) {
      console.error("❌ Gemini API Error:", error.message);
      bot.chat(`${sender} ❌ fama mochkla sghira, 3awed.`);
    }
  });

  bot.on('end', () => setTimeout(createBot, 5000));
  bot.on('error', (err) => console.error("❌ Bot error:", err.message));
}

createBot();
