const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "prompt가 없습니다." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const text = completion.choices[0].message.content;
    return res.status(200).json({
      content: [{ text }]
    });

  } catch (e) {
    console.error("OpenAI API 오류:", e);
    return res.status(500).json({ error: "운세 생성 실패", detail: e.message });
  }
};
