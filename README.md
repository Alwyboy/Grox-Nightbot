# nightbot-ai
Serverless endpoint untuk Nightbot menggunakan Groq (OpenAI-compatible). Deploy ke Vercel.

## Setup & deploy (singkat)
1. Buat repo di GitHub, push kode ini.
2. Login ke Vercel, pilih **Import Project** → pilih repo GitHub.
3. Di Vercel dashboard > Project > Settings > Environment Variables:
   - key: `GROQ_API_KEY`
   - value: (masukkan API key Groq-mu, jangan commit ke repo)
   - Environment: Production (juga Preview jika perlu)
4. Deploy.

## Endpoint
Setelah deploy, endpoint akan tersedia di:
`https://<your-deploy>.vercel.app/api/ai`

Nightbot call example:
