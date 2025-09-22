// api/ai.js
// Nightbot AI dengan chat memory sederhana (in-memory, versi aman) + absen reset tiap live stream

let chatHistories = {};  // simpan history chat user
let absenList = {};      // mapping user -> nomor absen
let absenCounter = 0;    // hitung absen global

// ====== Fungsi reset absen ======
function resetAbsen() {
  absenList = {};
  absenCounter = 0;
  console.log("✅ Absen direset (stream baru dimulai)");
}

export default async function handler(req, res) {
  try {
    const prompt = (req.query.prompt || "").trim();
    const username = (req.query.user ? String(req.query.user).toLowerCase() : "anon");
    const userLevel = (req.query.userlevel || "").toLowerCase(); 
    // Nightbot biasanya kasih userlevel: owner, moderator, regular, subscriber, everyone

    if (!prompt) {
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("apa sayang?");
    }

    // ====== Command Reset Absen (hanya moderator/owner) ======
    if (prompt.toLowerCase() === "!resetabsen") {
      if (userLevel === "moderator" || userLevel === "owner") {
        resetAbsen();
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send("📢 Absen sudah direset, silakan mulai daftar dari #1 ✨");
      } else {
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send("⚠️ Hanya moderator/owner yang bisa reset absen.");
      }
    }

    // ====== Command Absen ======
    if (prompt.toLowerCase() === "!absen") {
      if (!absenList[username] && absenCounter < 100) {
        absenCounter++;
        absenList[username] = absenCounter;
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send(`#${absenCounter} hadir ✋`);
      } else if (absenList[username]) {
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send(`Kamu sudah absen di nomor #${absenList[username]} 😉`);
      } else {
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send("⚠️ Absen sudah penuh sampai #100");
      }
    }

    // ====== MODE AI NORMAL ======
    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res
        .status(500)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("⚠️ API key belum diatur. Cek environment di Vercel.");
    }

    if (!chatHistories[username]) chatHistories[username] = [];

    chatHistories[username].push({ role: "user", content: prompt });

    if (chatHistories[username].length > 10) {
      chatHistories[username] = chatHistories[username].slice(-10);
    }

    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah chatbot humoris di live chat YouTube. Ingat obrolan sebelumnya dengan user. Jawab super singkat, jelas, santai, kayak manusia ngobrol. Maksimal 2 kalimat dan <200 karakter."
        },
        ...chatHistories[username]
      ],
      max_tokens: 250,
      temperature: 0.7
    };

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "<no body>");
      console.error("Groq API error:", resp.status, text);
      return res
        .status(502)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("⚠️ AI provider error. Cek logs di Vercel.");
    }

    const data = await resp.json().catch(() => null);
    let answer = "";

    if (data?.choices?.[0]?.message?.content) {
      answer = data.choices[0].message.content.trim();
    } else if (data?.choices?.[0]?.text) {
      answer = data.choices[0].text.trim();
    }

    if (!answer) {
      answer = "Hmm... aku agak bingung jawabnya 😅";
    }

    chatHistories[username].push({ role: "assistant", content: answer });

    const MAX_LENGTH = 190;
    const chunks = answer.match(new RegExp(`.{1,${MAX_LENGTH}}(\\s|$)`, "g")) || [answer];
    const finalAnswer = chunks.join("\n");

    res
      .status(200)
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .send(finalAnswer);

  } catch (err) {
    console.error("Handler error:", err);
    res
      .status(500)
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .send("⚠️ Internal server error. Cek logs di Vercel.");
  }
}
