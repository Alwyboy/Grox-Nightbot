// pages/index.js
export default function Home() {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      padding: "2rem",
      maxWidth: "600px",
      margin: "0 auto",
      lineHeight: "1.6"
    }}>
      <h1>Groq Nightbot AI</h1>
      <p>
        Selamat datang 👋<br />
        Endpoint ini dibuat untuk Nightbot agar bisa menjawab pertanyaan live chat
        dengan bantuan AI (Groq LLaMA).
      </p>

      <h2>API Endpoint</h2>
      <p>
        Gunakan endpoint berikut:<br />
        <code>https://grox-nightbot.vercel.app/api/ai?prompt=halo</code>
      </p>

      <h2>Nightbot Command</h2>
      <p>
        Tambahkan command Nightbot:
      </p>
      <pre style={{
        background: "#f4f4f4",
        padding: "1rem",
        borderRadius: "8px"
      }}>
!addcom !ai $(urlfetch https://grox-nightbot.vercel.app/api/ai?prompt=$(querystring))
      </pre>

      <p>
        Sekarang di live chat, penonton bisa tanya AI dengan perintah:<br />
        <code>!ai apa itu LLM?</code>
      </p>
    </div>
  );
        }
  
