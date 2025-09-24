import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function getUserHistory(username) {
  const { data } = await supabase
    .from("chat_history")
    .select("*")
    .eq("username", username)
    .order("created_at", { ascending: true })
    .limit(10);
  return data || [];
}

async function saveMessage(username, role, content) {
  await supabase.from("chat_history").insert([{ username, role, content }]);
}

export default async function handler(req, res) {
  try {
    const promptRaw = (req.query.prompt || "").trim();
    const usernameRaw = req.query.user || "anon";
    const username = String(usernameRaw).toLowerCase();

    if (!promptRaw) {
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("Halo! Silakan ketik pertanyaanmu.");
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res
        .status(500)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("⚠️ API key Groq belum diatur di environment.");
    }

    // Ambil history terakhir 10 chat dari Supabase
    const chatHistory = await getUserHistory(username);

    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah chatbot humoris dan ramah di live chat YouTube. Ingat obrolan sebelumnya dengan user. Jawab super singkat, <200 karakter, kayak manusia ngobrol santai. Jangan kaku, boleh pakai emoji."
        },
        ...chatHistory.map(c => ({ role: c.role, content: c.content })),
        { role: "user", content: promptRaw }
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

    // Simpan user prompt & jawaban AI ke Supabase
    await saveMessage(username, "user", promptRaw);
    await saveMessage(username, "assistant", answer);

    // Potong jawaban agar <200 karakter
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
