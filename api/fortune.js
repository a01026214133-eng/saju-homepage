export default async function handler(req, res) {
  const { userData, dateStr } = req.body;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,  // 환경변수로 숨김
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ /* 프롬프트 */ })
  });

  const data = await response.json();
  res.json(data);
}
