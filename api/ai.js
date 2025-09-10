// api/ai.js
// Nightbot AI dengan chat memory sederhana (in-memory)

let chatHistories = {}; // { username: [ {role, content}, ... ] }

export default async function handler(req, res) {
  try {
    const prompt = (req.query.prompt || "").trim();
    const username = (req.query.user || "anon").toLowerCase();

    if (!prompt) {
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("Cara pakai: !ai <pertanyaan>. Contoh: !ai apa itu LLM?");
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res
        .status(500)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("Server error: API key belum diatur di environment.");
    }

    // Ambil history user kalau ada
    if (!chatHistories[username]) chatHistories[username] = [];

    // Tambah pertanyaan user ke history
    chatHistories[username].push({ role: "user", content: prompt });

    // Batasin panjang history (misal 5 pesan terakhir)
    if (chatHistories[username].length > 10) {
      chatHistories[username] = chatHistories[username].slice(-10);
    }

    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah chatbot ramah di live chat YouTube. Ingat obrolan sebelumnya dengan user. Jawab singkat, jelas, santai, dan kayak manusia ngobrol. Jangan kaku, boleh pakai emoji seperlunya."
        },
        ...chatHistories[username] // sisipkan riwayat percakapan
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
        .send("AI provider error (lihat console).");
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

    // Biar ga kepanjangan di chat
    const MAX_LENGTH = 400;
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
      .send("Internal server error.");
  }
}
