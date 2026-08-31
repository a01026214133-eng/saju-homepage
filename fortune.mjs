import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { my, sp, children, hasChildren } = req.body;

  const childrenInfo = hasChildren && children.length > 0
    ? `[기존 자녀 정보]\n${children.map((c, i) => `- ${i+1}번째 자녀: ${c.date} ${c.hour}`).join('\n')}`
    : '[기존 자녀]: 없음';

  const prompt = `당신은 사주명리학에 정통한 "오복할머니"입니다. 따뜻하고 정겨운 할머니 말투로 임신운을 풀어주세요. 어렵고 딱딱한 표현보다 쉽고 포근한 말투를 써주세요.

[본인 사주 정보]
- 생년월일: ${my.date}
- 태어난 시간: ${my.hour}

[배우자 사주 정보]
- 생년월일: ${sp.date}
- 태어난 시간: ${sp.hour}

${childrenInfo}

아래 5가지 항목을 각각 3~5문장으로 따뜻하게 풀어주세요.
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "timing": "임신운이 강해지는 시기 (구체적인 연도와 계절을 포함해서 희망적으로)",
  "family_flow": "현재 가족의 전체적인 기운 흐름 (따뜻하고 긍정적으로)",
  "connection": "새로운 아이와의 인연 흐름 (아이의 기질과 인연이 오는 방향)",
  "action": "임신운을 맞이하기 위한 구체적인 행동 4가지 (줄바꿈으로 구분)",
  "grandma_words": "오복할머니가 직접 건네는 한마디 (할머니 말투로, 따뜻하고 위로가 되게)"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    console.error('Claude API error:', err);
    res.status(500).json({ error: err.message });
  }
}
