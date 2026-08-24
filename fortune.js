export default async function handler(req, res) {
  // POST만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않는 메서드입니다.' });
  }

  const { userData, dateStr } = req.body || {};

  // 프롬프트 구성
  let userInfo = '';
  if (userData) {
    const genderLabel = userData.gender === 'male' ? '남성' : '여성';
    const hourPart = userData.hour ? `, 태어난 시각: ${userData.hour}시` : '';
    userInfo = `
사용자 정보:
- 이름: ${userData.name}
- 생년월일: ${userData.year}년 ${userData.month}월 ${userData.day}일
- 성별: ${genderLabel}${hourPart}
- 고민 종류: ${userData.concern || '전반적인 운세'}
`;
  } else {
    userInfo = '사용자 정보: 없음 (일반 운세 제공)';
  }

  const prompt = `당신은 30년 경력의 한국 전통 역술가입니다. 사주명리학, 주역, 토정비결에 정통합니다.
오늘 날짜: ${dateStr || '오늘'}

${userInfo}

위 정보를 바탕으로 오늘의 운세를 다음 JSON 형식으로 정확하게 반환하세요.
절대로 JSON 외의 텍스트, 마크다운 코드블록, 설명을 포함하지 마세요.

{
  "icon": "운세를 나타내는 이모지 1개",
  "title": "오늘의 운세 제목 (10자 이내)",
  "overall": "전체 운세 2~3문장. 따뜻하고 한국 전통 역술 느낌으로.",
  "sections": [
    { "label": "💼 직장·사업운", "text": "2문장" },
    { "label": "❤️ 애정·인간관계", "text": "2문장" },
    { "label": "💰 금전운", "text": "2문장" },
    { "label": "🌿 건강운", "text": "1~2문장" }
  ],
  "luckyItem": "오늘의 행운 아이템 (색깔, 숫자, 방향 등 간단히)",
  "luckScore": 40에서 95 사이의 정수
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,  // Vercel 환경변수
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        message: err.error?.message || `Anthropic API 오류: ${response.status}`
      });
    }

    const aiData = await response.json();
    const raw = aiData.content.map(c => c.text || '').join('');

    // JSON 파싱
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw new Error('운세 데이터 파싱 실패');
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ message: err.message || '서버 오류가 발생했습니다.' });
  }
}
