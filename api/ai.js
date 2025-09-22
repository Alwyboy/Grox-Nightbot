let chatHistories = {}; 
let attendance = {};
let attendanceCounter = 1;
let currentDay = new Date().toDateString();

function resetAttendance() {
  attendance = {};
  attendanceCounter = 1;
  currentDay = new Date().toDateString();
}

export default async function handler(req, res) {
  try {
    const prompt = (req.query.prompt || "").trim();
    const usernameRaw = req.query.user || "anon";
    const username = String(usernameRaw).toLowerCase();
    const userlevel = (req.query.userlevel || "").toLowerCase();

    // Reset otomatis kalau ganti hari
    if (new Date().toDateString() !== currentDay) {
      resetAttendance();
    }

    // === HANDLE ABSEN ===
    if (prompt === "!absen") {
      if (!attendance[username]) {
        if (attendanceCounter > 100) {
          return res
            .status(200)
            .setHeader("Content-Type", "text/plain; charset=utf-8")
            .send(`⚠️ Absen sudah penuh (1-100).`);
        }
        attendance[username] = attendanceCounter++;
      }
      const nomor = attendance[username];
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send(`kamu ${usernameRaw} absen ke ${nomor}`);
    }

    // === HANDLE RESET ABSEN ===
    if (prompt === "!resetabsen") {
      if (userlevel === "moderator" || userlevel === "owner") {
        resetAttendance();
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send("📋 Daftar absen sudah direset!");
      } else {
        return res
          .status(200)
          .setHeader("Content-Type", "text/plain; charset=utf-8")
          .send("⚠️ Hanya moderator/owner yang bisa reset absen.");
    }

    // === HANDLE AI ===
    if (!prompt) {
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("apa sayang?");
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res
        .status(500)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("⚠️ API key belum diatur. Cek environment di Vercel.");
    }

    // Inisialisasi history user kalau belum ada
    if (!chatHistories[username]) chatHistories[username] = [];

    // Tambahkan pertanyaan user ke history
    chatHistories[username].push({ role: "user", content: prompt });

    // Batasin riwayat agar nggak terlalu panjang
    if (chatHistories[username].length > 10) {
      chatHistories[username] = chatHistories[username].slice(-10);
    }

    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah chatbot humoris dan ramah di live chat YouTube. Ingat obrolan sebelumnya dengan user. Jawab super singkat, <200 karakter, kayak manusia ngobrol santai. Jangan kaku, boleh pakai emoji."
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

    // Simpan jawaban AI ke history
    chatHistories[username].push({ role: "assistant", content: answer });

    // Potong jawaban kalau terlalu panjang (YouTube chat limit ±200 char)
    const MAX_LENGTH = 200;
    if (answer.length > MAX_LENGTH) {
      answer = answer.slice(0, MAX_LENGTH - 3).trim() + "...";
    }

    res
      .status(200)
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .send(answer);

  } catch (err) {
    console.error("Handler error:", err);
    res
      .status(500)
      .setHeader("Content-Type", "text/plain; charset=utf-8")
      .send("⚠️ Internal server error. Cek logs di Vercel.");
  }
}
