const Anthropic = require('@anthropic-ai/sdk');

// ─── 사주 계산 엔진 ───
const 천간오행  = [0,0,1,1,2,2,3,3,4,4];
const 지지오행  = [4,2,0,0,2,1,1,2,3,3,2,4];
const 천간음양  = [0,1,0,1,0,1,0,1,0,1];
const 오행명    = ['목','화','토','금','수'];
const 천간명    = ['갑','을','병','정','무','기','경','신','임','계'];
const 지지명    = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

function getGanZhi(year, month, day) {
  const yG = (year - 4) % 10;
  const yZ = (year - 4) % 12;
  const mBase = (year - 1900) * 12 + month;
  const mG = (mBase + 2) % 10;
  const mZ = (month + 1) % 12;
  const a  = Math.floor((14 - month) / 12);
  const y2 = year + 4800 - a;
  const m2 = month + 12 * a - 3;
  const jd = day + Math.floor((153 * m2 + 2) / 5)
           + 365 * y2 + Math.floor(y2 / 4)
           - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  const dG = (jd + 4) % 10;
  const dZ = (jd + 4) % 12;
  return {
    year:  { gan: ((yG % 10) + 10) % 10, zhi: ((yZ % 12) + 12) % 12 },
    month: { gan: ((mG % 10) + 10) % 10, zhi: ((mZ % 12) + 12) % 12 },
    day:   { gan: ((dG % 10) + 10) % 10, zhi: ((dZ % 12) + 12) % 12 },
  };
}

function getHourZhi(hourStr) {
  const map = {
    '자시(00:00~00:59)':0,'축시(01:00~02:59)':1,'인시(03:00~04:59)':2,
    '묘시(05:00~06:59)':3,'진시(07:00~08:59)':4,'사시(09:00~10:59)':5,
    '오시(11:00~12:59)':6,'미시(13:00~14:59)':7,'신시(15:00~16:59)':8,
    '유시(17:00~18:59)':9,'술시(19:00~20:59)':10,'해시(21:00~22:59)':11,
    '모름': -1,
  };
  return map[hourStr] ?? -1;
}

function parseSaju(dateStr, hourStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const gz  = getGanZhi(y, m, d);
  const hZ  = getHourZhi(hourStr);
  const dayGanOh   = 천간오행[gz.day.gan];
  const 생하는오행 = (dayGanOh + 1) % 5;
  let childStar = 0;
  [gz.year, gz.month, gz.day].forEach(p => {
    if (천간오행[p.gan] === 생하는오행) childStar++;
    if (지지오행[p.zhi] === 생하는오행) childStar++;
  });
  if (hZ >= 0 && 지지오행[hZ] === 생하는오행) childStar++;
  return { gz, hZ, dayGanOh, 생하는오행, childStar, year: y, month: m, day: d };
}

function sajuSummary(saju, label) {
  const { gz, hZ } = saju;
  const 연주 = `${천간명[gz.year.gan]}${지지명[gz.year.zhi]}년`;
  const 월주 = `${천간명[gz.month.gan]}${지지명[gz.month.zhi]}월`;
  const 일주 = `${천간명[gz.day.gan]}${지지명[gz.day.zhi]}일`;
  const 시주 = hZ >= 0 ? `${지지명[hZ]}시` : '시간 미상';
  return `${label}: ${연주} ${월주} ${ 일주} ${시주} | 일간 ${오행명[saju.dayGanOh]}, 자녀성 ${saju.childStar}개`;
}

function getGoodYears(saju) {
  const curYear = new Date().getFullYear();
  const 오행지지 = [[2,3],[5,6],[0,1,4,7],[8,9],[10,11]];
  const 길지지 = 오행지지[saju.생하는오행];
  const result = [];
  for (let y = curYear; y <= curYear + 3; y++) {
    const yZ = ((y - 4) % 12 + 12) % 12;
    if (길지지.includes(yZ)) result.push(y);
  }
  return result;
}

function getMonthlyFortune(saju) {
  const 자녀오행 = saju.생하는오행;
  const 오행월강도 = [
    [7,8,7,9,10,8,6,7,6,5,4,5],
    [5,5,6,8,9,10,8,7,6,5,4,4],
    [6,6,9,7,6,9,7,6,9,7,6,9],
    [4,4,5,6,7,7,8,9,10,9,7,5],
    [9,8,6,5,5,5,6,6,6,7,9,10],
  ];
  return 오행월강도[자녀오행];
}

// ─── API 핸들러 ───
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { my, sp, children, hasChildren } = req.body;

  const mySaju = parseSaju(my.date, my.hour);
  const spSaju = parseSaju(sp.date, sp.hour);
  const goodYears = getGoodYears(mySaju);
  const curYear = new Date().getFullYear();
  const monthlyFortune = getMonthlyFortune(mySaju);

  const childrenInfo = hasChildren && children && children.length > 0
    ? `[기존 자녀]\n${children.map((c, i) => `- ${i+1}번째: ${c.date} ${c.hour}`).join('\n')}`
    : '[기존 자녀]: 없음';

  const totalChildStar = mySaju.childStar + spSaju.childStar;
  const pregStar   = Math.min(5, Math.max(1, Math.round(totalChildStar / 2) + (goodYears.includes(curYear) ? 1 : 0)));
  const nauseaStar = ((mySaju.gz.day.gan + mySaju.gz.month.gan) % 5) + 1;
  const energyStar = Math.min(5, Math.max(1, 3 + (천간음양[mySaju.gz.day.gan] === 0 ? 1 : -1)));
  const birthStar  = Math.min(5, Math.max(1, pregStar + (천간음양[mySaju.gz.day.gan] !== 천간음양[spSaju.gz.day.gan] ? 1 : 0)));
  const sensitiveStar = Math.min(5, Math.max(1, 6 - energyStar));

  const 좋은계절 = ['봄','여름','환절기','가을','겨울'][mySaju.생하는오행];
  const 어려운시기_idx = monthlyFortune.indexOf(Math.min(...monthlyFortune));
  const 어려운월 = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'][어려운시기_idx];

  const prompt = `당신은 사주명리학에 정통한 "오복할머니"입니다. 따뜻하고 정겨운 할머니 말투로 임신운을 풀어주세요.
의학적 진단이나 유산·질병 예측은 절대 하지 말고, 사주상 기운과 컨디션 흐름으로만 표현해주세요.

[부부 사주]
${sajuSummary(mySaju, '본인(여성)')}
${sajuSummary(spSaju, '배우자(남성)')}

[사주 분석 데이터]
- 본인 자녀성 오행: ${오행명[mySaju.생하는오행]} (자녀성 ${mySaju.childStar}개)
- 배우자 자녀성 오행: ${오행명[spSaju.생하는오행]} (자녀성 ${spSaju.childStar}개)
- 부부 자녀성 합산: ${totalChildStar}개
- 올해(${curYear}) 임신운 길한 해: ${goodYears.includes(curYear) ? '예' : '아니오'}
- 향후 임신운 좋은 해: ${goodYears.length > 0 ? goodYears.join(', ') + '년' : '단기 내 없음, 내면 준비 시기'}
- 임신운이 강한 계절: ${좋은계절}
- 컨디션 관리 필요한 달: ${어려운월}
${childrenInfo}

아래 12가지 항목을 사주 데이터에 기반해 따뜻하고 재미있게 작성해주세요.
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.

{
  "timing_title": "임신운이 강해지는 시기를 한 줄 제목으로 (예: '따뜻한 봄기운과 함께 찾아오는 아이')",
  "timing_desc": "올해/내년, 상반기/하반기, 계절별로 구체적으로 3~4문장. 위 분석 데이터의 연도·계절 반영. 희망적으로.",
  "monthly_comment": "월별 임신운 그래프에 대한 한 줄 코멘트 (예: '봄철이 가장 기운이 모이는 시기예요 🌸')",
  "pregnancy_timing": "나의 임신 타이밍 - 사주풀이를 곁들여 재미있게 2~3문장. 어떤 기운의 아이가 언제 올지.",
  "pregnancy_style": "임신 초기 나의 스타일 유형명 (예: '평온한 순둥 임산부형' / '체력 방전형' / '걱정 많은 검색중독형' / '몸보다 마음이 예민한 형' / '생각보다 씩씩한 활동형' 중 사주에 맞게 선택 또는 새로 만들기)",
  "pregnancy_style_desc": "위 유형에 대한 설명 2~3문장. 재미있고 공감되게.",
  "nausea_type": "입덧 유형명 (예: '무입덧형' / '냄새 입덧형' / '먹덧형' / '토덧형' / '특정 음식 집착형' / '초반 몰아치기형' / '오래가는 입덧형' 중 사주에 맞게 선택 또는 새로 만들기)",
  "nausea_desc": "입덧 유형 설명 2~3문장. 엔터테인먼트 요소로 재미있게.",
  "craving_food": "임신 중 당길 음식 유형 (예: '새콤달콤한 과일' / '고기' / '면' / '얼음·차가운 음식' / '단 음식' / '매운 음식' 중 하나 또는 새로 만들기)",
  "craving_desc": "당길 음식에 대한 재미있는 설명 1~2문장.",
  "emotion_type": "임신 중 감정 변화 유형명 (예: '갑자기 눈물이 많아지는 감성형' / '사소한 것에도 예민해지는 까칠형' / '의외로 마음이 편안해지는 안정형' / '하루 종일 아기 걱정하는 걱정쟁이형' / '남편에게 유독 서운해지는 사랑확인형' 중 사주에 맞게 선택 또는 새로 만들기)",
  "emotion_desc": "감정 유형 설명 2문장. 공감되게.",
  "hard_period": "임신 중 가장 힘든 시기 (초기/중기/후기/출산 중 하나)",
  "hard_period_desc": "왜 그 시기가 힘든지 사주 관점으로 2~3문장. 단, 의학적 질병·유산 언급 금지. 컨디션·기운 표현만.",
  "care_period": "특히 컨디션 관리가 필요한 시기 (임신 초기/중기/후기 중 하나, 위 어려운 달 반영)",
  "care_desc": "컨디션 관리 조언 2~3문장. 따뜻하게.",
  "birth_desc": "순산운 설명 2~3문장. 출산까지의 전체 흐름을 희망적으로.",
  "mom_type": "출산 후 어떤 엄마 유형 (예: '아기 껌딱지 엄마' / '육아템부터 사는 장비형 엄마' / '계획표 만드는 계획형 엄마' / '육아는 실전! 씩씩한 엄마' / '남편과 함께 키우는 팀플형 엄마' / '걱정이 많은 검색형 엄마' 중 사주에 맞게 선택 또는 새로 만들기)",
  "mom_type_desc": "엄마 유형 설명 2문장. 재미있고 따뜻하게.",
  "grandma_words": "오복할머니가 직접 건네는 한마디 (할머니 말투로, 따뜻하고 위로가 되게, 2~3문장)"
}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text  = response.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // 서버에서 계산한 데이터 첨부
    result.monthly_fortune = monthlyFortune;
    result.good_years = goodYears;
    result.best_season = 좋은계절;
    result.preg_star   = pregStar;
    result.nausea_star = nauseaStar;
    result.energy_star = energyStar;
    result.birth_star  = birthStar;
    result.sensitive_star = sensitiveStar;

    res.status(200).json(result);
  } catch (err) {
    console.error('Claude API error:', err);
    console.error('Error details:', JSON.stringify(err.error, null, 2));
    res.status(500).json({ error: err.message });
  }
};
