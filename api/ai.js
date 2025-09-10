// api/ai.js
// Vercel serverless function (Node.js). Returns plain text for Nightbot's $(urlfetch).
export default async function handler(req, res) {
  try {
    // Accept prompt via query param `prompt` (use Nightbot $(querystring))
    const prompt = (req.query.prompt || "").trim();

    if (!prompt) {
      // Nightbot will display this if user calls !ai tanpa argumen
      return res
        .status(200)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("Usage: !ai <pertanyaan>. Contoh: !ai apa itu LLM?");
    }

    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      return res
        .status(500)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("Server error: API key belum diatur di environment.");
    }

    // Construct request to Groq OpenAI-compatible endpoint
    const payload = {
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "user", content: prompt }
      ],
      // optional: batasi token agar respons tidak terlalu panjang
      max_tokens: 300,
      temperature: 0.2
    };

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      // timeout not supported on fetch by default; rely on platform
    });

    if (!resp.ok) {
      const text = await resp.text().catch(()=>"<no body>");
      console.error("Groq API error:", resp.status, text);
      return res
        .status(502)
        .setHeader("Content-Type", "text/plain; charset=utf-8")
        .send("AI provider error (lihat console).");
    }

    const data = await resp.json().catch(()=>null);
    // Try to extract assistant message
    let answer = "";

    if (data && data.choices && data.choices.length > 0) {
      // OpenAI-compatible: choices[0].message.content
      const m = data.choices[0].message;
      if (m && typeof m.content === "string") answer = m.content.trim();
    }

    // Fallbacks
    if (!answer && data && data.choices && data.choices[0] && data.choices[0].text) {
      answer = data.choices[0].text.trim();
    }
    if (!answer) {
      answer = "Maaf, tidak mendapatkan jawaban dari model.";
    }

    // Limit length — Nightbot has message length limits; trim safely
    const MAX_LENGTH = 450; // cukup agar pas di chat
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
