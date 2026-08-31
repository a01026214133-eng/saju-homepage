const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { myBirth, myHour, myGender, spBirth, spHour, spGender, children } = req.body;

  const childrenInfo = children && children.length > 0
    ? `[기존 자녀]\n${children.map((c, i) => `- ${i+1}번째: ${c.birth} ${c.hour} ${c.gender}`).join('\n')}`
    : '[기존 자녀]: 없음';

  const prompt = `당신은 사주명리학에 정통한 "오복할머니"입니다. 따뜻하고 정겨운 할머니 말투로 자식과의 인연을 풀어주세요.

[본인 정보]
- 생년월일: ${myBirth}
- 태어난 시간: ${myHour}
- 성별: ${myGender}

[배우자 정보]
- 생년월일: ${spBirth}
- 태어난 시간: ${spHour}
- 성별: ${spGender}

${childrenInfo}

아래 항목들을 각각 3~5문장으로 따뜻하게 풀어주세요.
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "parentMy": "본인의 자식운 (자녀와의 인연, 부모로서의 기질)",
  "parentSp": "배우자의 자식운 (배우자와 자녀의 인연)",
  "coupleEnergy": "부부의 기운 (두 사람이 만들어내는 에너지)",
  "familyFlow": "가족 전체의 흐름과 방향",
  "existingChildren": "기존 자녀의 사주 기질과 부모와의 관계 (자녀가 없으면 빈 문자열)",
  "futureChild": "앞으로 맞이할 아이와의 인연",
  "childPersonality": "아이가 가진 기질과 성향",
  "parentChildRelation": "부모와 아이가 어떤 관계로 만날지",
  "talents": "아이가 타고난 재능과 빛날 분야",
  "future": "아이가 펼칠 미래의 가능성",
  "halmae": "오복할머니의 따뜻한 한마디 (할머니 말투로)"
}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
};
