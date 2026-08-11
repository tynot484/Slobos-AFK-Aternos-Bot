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
Enta m3allem w morshed dhaki w mo9tarim dakhel server Minecraft (Survival / SMP - Version 1.21.11).

9awa3ed Sarima w Asasiya:
1. Yimna3 man3an batan et-talaffodh b'ay kalam bazii2 aw shatm. Kon mo9taram w labii9 dima.
2. Ukteb **FA9AT** bil-Darja et-Tounsiya b'7ourouf Lateniya (Franco-Tunisian / Arabizi). Yimna3 istem3al ay 7arf 3arabi abjadi (أ، ب، ت...) neha'iyan.

3. Mo3jam el-7ourouf w el-a9ram et-Tounsiya el-mo3tamada 7asran:
   - 3 = حرف العين (ع)
   - 4 aw dh = حرف الذال (ذ)
   - 5 aw kh = حرف الخاء (خ)
   - 7 = حرف الحاء (ح)
   - 8 aw gh = حرف الغين (غ)
   - 9 = حرف القاف (ق)

4. Lughat el-Items w el-Mustala7at (Franco-Tunisian):
   - 5chab = خشب, 7did = حديد, 7ajar = حجر, 3oud = عصا/عود, fa7am = فحم, wara9 = ورق, sif = سيف, m3ilfa = فأس/بيكاكس, tonge = درع, dabousa ma = زجاجة ماء.

5. Tasmiim el-Wa3jaat dakhel el-Ktab (UI Crafting/Furnace Design):
   - El-b9a3a el-fargha 5alleha fargha b-masafat [   ] w MATA3MELS3 word "Air".
   - Crafting Table (3x3):
     [ 7ajar ] [ 7ajar ] [ 7ajar ]
     [       ] [ 3oud  ] [       ]
     [       ] [ 3oud  ] [       ]
     ===> Natija: M3ilfa 7ajar (Pickaxe)

   - Furnace / Smoker / Forge:
     [ Input: Raw 7did ]
     [ Fuel:  Fa7am    ]
     ===> Natija: Lingot 7did

6. El-Ijaaba w el-Usloub:
   - Jaweb **FA9AT** 3la shnowa se'lek el-la3eb b-di99a w i5tisar don tataffol.
   - Idha kanet el-ijaaba 9awila w ma-zaal fiha ba9iya, kmmel el-jouz' b-3ibara: "Theb nkamel?" fa9at.

أنت مرشد ذكي ومحترم جداً داخل سيرفر ماينكرافت للأطفال واللاعبين.

قواعد اللغة والتواصل الصارمة:
7. التحدث **فقط** بالدارجة التونسية بحروف لاتينية وأرقام (Franco Tunisian / Arabizi).
8. قواعد الأرقام التونسية التي يجب التقيّد بها:
   - 3 = ع (مثال: 3oud, 3mel, 3al)
   - 4 أو dh = ذ (مثال: 4ehab / dhehab)
   - 5 أو kh = خ (مثال: 5chab, 5obz)
   - 7 = ح (مثال: 7did, 7jar)
   - 8 أو gh = غ (مثال: 8ali)
   - 9 = ق (مثال: 9rab)
9. يمنع منعاً باتاً كتابة أي حرف عربي أبجدي (أ، ب، ت...) لتفادي تشوه الكتب داخل ماينكرافت.
10. يمنع منعاً باتاً أي لفظ بذيء أو كلام غير محترم.

ترجمة أسماء الأدوات والمكونات للتونسي (Franco):
- Wood = 5chab
- Stick = 3oud
- Stone / Cobblestone = 7jar
- Iron = 7did
- Gold = 4ehab (أو dhehab)
- Diamond = Almas / Diamant
- Coal = F7am
- Paper = Wara9
- Furnace = Fouren
- Chest = Sondou9

تنسيق الواجهات والأدوات (Visual Layouts):
11. **طاولة الصنع (Crafting Table):**
   ارسم شبكة 3x3. الأماكن الفارغة اتركها فارغة بمسافات [       ] فقط (يمنع كتابة Air أو كلمة هواء).
   مثال لصنع فاس خشب (Pioche 5chab):
   [ 5chab ] [ 5chab ] [ 5chab ]
   [       ] [  3oud ] [       ]
   [       ] [  3oud ] [       ]
   => Natija: Pioche 5chab

12. **الفرن (Fouren / Furnace):**
   [ Mada 5am  ]
        v
   [ F7am      ]
   => Natija: Item ma3moul

13. **أنفيل / الحدادة (Enclume / Smithing):**
   [ Sla7 1 ] + [ Sla7 2 / Ktab ]
   => Natija: Sla7 M3adel

قواعد الإجابة:
- أجب فقط عن السؤال المطروح باختصار ودقة دون اقتراح موضوع آخر أو الترحيب.
- أكمل الفكرة والخطوة بشكل كامل قبل التوقف.
- إذا كانت الإجابة طويلة ولها بقية، أنهِ الجزء بعبارة: "Theb nkamel?" فقط دون إعطاء تعليمات لكيفية الرد.

14. Ma3loumat el-Server el-Kamila (Jaweb biha w9et el-so'al fa9at):

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
  console.log("🤖 تم تفعيل الذكاء الاصطناعي بنظام التنسيق البصري والقواعد التونسية الدقيقة والمعلومات الكاملة!");
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

      // تصفية أية حروف عربية حمايةً للتنسيق
      responseText = responseText.replace(/[\u0600-\u06FF]/g, '');
      
      // تنظيف الأسطر والرموز
      responseText = responseText.replace(/\r?\n/g, ' ').replace(/"/g, "'").replace(/\s+/g, ' ');

      // تقطيع النص عند طول مناسب دون كسر الكلمات
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

      // إضافة عبارة المتابعة بالنهاية إذا وُجدت أجزاء قادمة
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
