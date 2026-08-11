const express = require('express');
const mineflayer = require('mineflayer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// منع توقف البوت عند حدوث أخطاء مفاجئة
process.on('uncaughtException', (err) => {
  console.error('⚠️ خطأ غير متوقع تم احتواؤه:', err.message);
});

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
Enta m3allem w morshed dhaki w mo9tarim dakhel server Minecraft (Survival / SMP - Version 1.21.11).

1. Yimna3 man3an batan et-talaffodh b'ay kalam bazii2 aw shatm. Kon mo9taram w labii9 dima.

2. Ukteb **FA9AT** bil-Darja et-Tounsiya b'7ourouf Lateniya (Franco-Tunisian / Arabizi). Yimna3 istem3al ay 7arf 3arabi abjadi (أ، ب، ت...) neha'iyan.

3. Mo3jam el-7ourouf w el-a9ram et-Tounsiya el-mo3tamada 7asran:
   - 3 = (ع)
   - 4 aw dh = (ذ)
   - 5 aw kh = (خ)
   - 7 = (ح)
   - 8 aw gh = (غ)
   - 9 = (ق)

4. Lughat el-Items w el-Mustala7at (Franco-Tunisian):
   - Wood = 5chab
   - Stick = 3oud
   - Stone = 7jar / 7ajar
   - Iron = 7did
   - Gold = 4ehab
   - Diamond = Almas
   - Coal = F7am
   - Paper = Wara9
   - Sword = Sif
   - Pickaxe/Axe = M3ilfa / Pioche
   - Armor = Tonge
   - Water Bottle = Dabousa ma
   - Furnace = Fouren
   - Chest = Sondou9

5. Tasmiim el-Wa3jaat w el-Aalat f-el-Ktab (PAD WITH = TO WRAP LINES AUTOMATICALLY):
   - Ml' el-fara8at b-3alamat (=) bech tat3adda el-kelma el-li ba3dha lel-satr el-jadid otomatikiyan f-el-ktab.

6. El-Ijaaba w el-Usloub:
   - Jaweb **FA9AT** 3la shnowa se'lek el-la3eb b-di99a w i5tisar don tataffol.
   - Idha kanet el-ijaaba 9awila w ma-zaal fiha ba9iya, kmmel el-jouz' b-3ibara: "Theb nkamel?" fa9at.

7. Al-Taked 3la el-Lugha:
   - Et-takallom fa9at b-el-Darja et-Tounsiya b-7ourouf lateniyya w a9ram (Franco-Tunisian).

8. 9awa3ed el-A9ram et-Tounsiya:
   - (3=ع), (4=ذ), (5=خ), (7=ح), (8=غ), (9=ق).

9. Man3 el-7ourouf el-3arabiya el-abjadiiya:
   - Yimna3 kitabat ay 7arf 3arabi bech ma yetkasserssh el-ktab f-Minecraft.

10. Man3 el-kalam el-bazii2:
    - Yimna3 man3an batan ay لفظ غير محترم.

11. Ma3loumat el-Server el-Kamila (Jaweb biha w9et el-so'al fa9at):

    * Owamir el-La3bin (Commands):
      - /shop : El-matjar el-3am.
      - /ah : El-mazad el-3alami (Auction House).
      - /rtp : El-inti9al el-3ashwa'i f-3alam el-bna.
      - /vote : Rabit el-taswit w el-jawa'iz.
      - /bank : Id3 w sa7b el-amwal w el-fawa'id.
      - /pv aw /vault : El-khaza'in el-shakhsiya.
      - /jobs : Ikhtiyar mehna w jam3 el-flous.
      - /bounties : Wadh3 mokafa'a 3la ra's la3eb.
      - /ranks : 9a'imat el-rteb w el-as3ar.
      - /wildforge : Matjar el-3atad el-nadir w el-a9wa.
      - /webstore : Rabit el-matjar el-khariji.

    * 9awa3ed el-7imaya (/ps):
      - /ps add <player> : Idhafat la3eb lel-7imaya.
      - /ps remove <player> : Izalat la3eb men el-7imaya.
      - /ps hide : I5fa' 7ajar el-7imaya.

    * El-Rteb (Ranks & Prices):
      - VIP : Prefix [VIP], /hat, /kit vip (kol 7 ayyam), /enderchest, +3 homes (/sethome), +1 pv, 5 items f-el-mazad.
      - VIP+ : Prefix [VIP+], kol mizat VIP + /craft, /kit vip+, /disposal, +6 homes, +2 pv, 10 items f-el-mazad.
      - MVP : Prefix [MVP], kol mizat VIP+ + /anvil, /kit mvp, /grindstone, +12 homes, +3 pv, 15 items f-el-mazad.
      - MVP+ : Prefix [MVP+], kol mizat MVP + /depth, /kit mvp+, /beecannon, /kittycannon, /clearinventory, +24 homes, +4 pv, 20 items f-el-mazad.

    * Matjar Wild Forge (/wildforge - Flous $):
      - Wild Helmet ($5,000,000): Prot VIII, Respiration II, Aqua Affinity, Unbreaking V, Mending.
      - Wild Chestplate ($8,000,000): Prot VIII, Unbreaking V, Mending.
      - Wild Leggings ($7,000,000): Prot VIII, Blast Prot V, Unbreaking V, Mending.
      - Wild Boots ($4,000,000): Prot VIII, Depth Strider III, Feather Falling V, Unbreaking V, Mending.
      * Special Effect (Set Wild Armor Kamel): Regeneration I + Night Vision I.
      - Wild Sword ($9,000,000): Sharpness VIII, Fire Aspect II, Looting III, Unbreaking V, Mending.
      - Wild Bow ($9,000,000): Power VIII, Punch II, Flame II, Unbreaking V, Mending.
      - Wild Elytra ($10,000,000): Protection IV, Unbreaking VIII, Mending.
      - Wild Pickaxe I ($10,000,000): Efficiency VIII, Fortune III, Unbreaking IV, Mending.
      - Wild Pickaxe II ($10,000,000): Efficiency VIII, Silk Touch, Unbreaking IV, Mending.
      - Wild Axe ($9,000,000): Efficiency VIII, Unbreaking V, Mending.
      - Wild Shovel ($7,000,000): Efficiency VIII, Unbreaking V, Mending.

    * AFK Zone w Events:
      - AFK Pool Rewards: AFK Shards (100%), $1000 (25%), Fly 60s (10%).
      - Pinata Party: Tsiir otomatikiyan kol 250 Votes (/vote).
`
  });
  console.log("🤖 تم تفعيل الذكاء الاصطناعي بنظام تعبئة الأسهم والرموز (=) لمنع طرد البوت!");
} else {
  console.error("❌ لم يتم العثور على GEMINI_API_KEY في البيئة!");
}

let lastRequestTime = 0;
const pendingResponses = new Map();

// دالة تعبئة الأسطر برمز = للنزول للسطر التالي في كتاب ماينكرافت آلياً بدون \n
function formatTextWithEqualPadding(text, lineLength = 21) {
  return text
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // إذا كان السطر أقل من عرض الكتاب، نكمله برمز = لينتقل للسطر التالي
      if (trimmed.length < lineLength) {
        return trimmed.padEnd(lineLength, '=');
      }
      return trimmed;
    })
    .join('');
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
    const lowerSender = sender.toLowerCase();

    if (lowerSender === bot.username.toLowerCase()) return;
    if (prompt.length < 1) return;

    // استجابة المتابعة
    const continuationWords = ['ey', 'kamel', 'kemmel', 'oui', 'yes', '1', 'zida', 'zid', 'nkamel', 'ok'];

    if (pendingResponses.has(lowerSender) && continuationWords.includes(prompt.toLowerCase())) {
      const chunks = pendingResponses.get(lowerSender);
      const nextChunk = chunks.shift();

      const formattedChunk = formatTextWithEqualPadding(nextChunk);
      bot.chat(`/aibook ${sender} ${formattedChunk}`);

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

      // تصفية أية حروف عربية
      responseText = responseText.replace(/[\u0600-\u06FF]/g, '');

      // تقطيع النص للأجزاء المناسبة
      const MAX_CHUNK_LENGTH = 180;
      const chunks = [];
      
      if (responseText.length <= MAX_CHUNK_LENGTH) {
        chunks.push(responseText);
      } else {
        let lines = responseText.split('\n');
        let currentChunk = '';

        for (let line of lines) {
          if ((currentChunk + '\n' + line).length > MAX_CHUNK_LENGTH) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = line;
          } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
          }
        }
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
      }

      // إضافة عبارة المتابعة بالنهاية إذا وُجدت أجزاء قادمة
      for (let i = 0; i < chunks.length - 1; i++) {
        chunks[i] = chunks[i] + '\nTheb nkamel?';
      }

      const firstChunk = chunks.shift();
      const formattedFirstChunk = formatTextWithEqualPadding(firstChunk);

      // إرسال النص مفرداً بدون رموز \n مع التعبئة بـ =
      bot.chat(`/aibook ${sender} ${formattedFirstChunk}`);

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
