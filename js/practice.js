// 연습 문제: 하늘미술관 방문 기록 (가짜 데이터 600여 건)
// 데이터는 고정 시드 난수로 만들어서 어느 브라우저에서든 똑같다 → 정답도 항상 같다.
// 본편 사건의 범인과 관계없는 이야기라 언제 풀어도 스포일러가 없다.

(function (root) {
  "use strict";

  const RANDOM_ROWS = 600;
  const SEED = 20261114;

  // 결정적 난수 (mulberry32)
  function makeRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function weighted(rand, pairs) {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [value, w] of pairs) {
      if ((r -= w) < 0) return value;
    }
    return pairs[pairs.length - 1][0];
  }

  const SURNAMES = [
    ["김", 20], ["이", 15], ["박", 9], ["최", 5], ["정", 5], ["강", 3], ["조", 3], ["윤", 3],
    ["장", 3], ["임", 3], ["한", 2], ["오", 2], ["서", 2], ["신", 2], ["권", 2], ["황", 2],
    ["안", 2], ["송", 2], ["류", 1], ["홍", 1],
  ];
  const SYLLABLES = "민서지현우준윤하도예은수진영태호연유시재나린건원아성혜동주희".split("");
  const CITIES = [
    ["서울", 30], ["수원", 12], ["인천", 8], ["부산", 10], ["대구", 7], ["광주", 6],
    ["대전", 6], ["울산", 4], ["세종", 3], ["청주", 4], ["제주", 3],
  ];
  const EXHIBITIONS = ["새벽의 강 특별전", "현대 조각전", "한국 근대 회화", "도시의 밤 사진전", "어린이 체험관"];
  // 본편 등장인물과 같은 이름은 만들지 않는다
  const RESERVED = new Set(["김도윤", "이서연", "박준호", "최유나", "정민재", "한지우", "오세진", "윤하린", "강태오", "송미래"]);

  // 마지막 문제(분실물 주인 찾기)를 위해 심어 둔 기록
  const LOST_WALLET = { date: "2026-08-15", exhibition: "현대 조각전", city: "수원" };
  const PLANTED = [
    { name: "배수아", age: 17, city: "수원", visit_date: "2026-08-15", exhibition: "현대 조각전", ticket: "학생", stay_minutes: 95, spent: 32000 },
    { name: "노현서", age: 44, city: "수원", visit_date: "2026-08-15", exhibition: "현대 조각전", ticket: "일반", stay_minutes: 70, spent: 0 },
  ];

  function dateFromDayOfYear(day) {
    const d = new Date(Date.UTC(2026, 0, 1) + day * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function ticketFor(age, rand) {
    if (rand() < 0.08) return "무료";
    if (age < 13) return "어린이";
    if (age <= 19) return "학생";
    if (age >= 65) return "경로";
    return "일반";
  }

  function generateRows() {
    const rand = makeRandom(SEED);
    const rows = [];
    // 1월 2일 ~ 11월 13일 (도난 사건 전날까지)
    const firstDay = 1;
    const lastDay = 316;
    while (rows.length < RANDOM_ROWS) {
      const name = weighted(rand, SURNAMES) +
        SYLLABLES[Math.floor(rand() * SYLLABLES.length)] +
        SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
      const ageGroup = weighted(rand, [["child", 15], ["teen", 12], ["adult", 50], ["senior", 23]]);
      const age = {
        child: () => 7 + Math.floor(rand() * 6),
        teen: () => 13 + Math.floor(rand() * 7),
        adult: () => 20 + Math.floor(rand() * 45),
        senior: () => 65 + Math.floor(rand() * 18),
      }[ageGroup]();
      const city = weighted(rand, CITIES);
      const visit_date = dateFromDayOfYear(firstDay + Math.floor(rand() * (lastDay - firstDay + 1)));
      const exhibition = age < 13 && rand() < 0.6
        ? "어린이 체험관"
        : EXHIBITIONS[Math.floor(rand() * (age < 13 ? 5 : 4))];
      const ticket = ticketFor(age, rand);
      const stay_minutes = 20 + 5 * Math.floor(rand() * 41); // 20 ~ 220분, 5분 단위
      const spent = rand() < 0.55 ? 0 : 1000 + 100 * Math.floor(rand() * 890); // 0 또는 1,000 ~ 89,900원

      if (RESERVED.has(name)) continue;
      const row = { name, age, city, visit_date, exhibition, ticket, stay_minutes, spent };
      // 분실물 문제의 정답이 하나로 정해지도록, 같은 날·같은 전시·같은 도시 기록은 만들지 않는다
      if (visit_date === LOST_WALLET.date && exhibition === LOST_WALLET.exhibition && city === LOST_WALLET.city) continue;
      rows.push(row);
    }
    const all = rows.concat(PLANTED);
    // 방문 날짜 순으로 번호를 매긴다 (같은 날은 이름순)
    all.sort((a, b) => (a.visit_date < b.visit_date ? -1 : a.visit_date > b.visit_date ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return all.map((r, i) => ({ id: i + 1, ...r }));
  }

  function sqlString(v) {
    return typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
  }

  function buildSQL() {
    const cols = ["id", "name", "age", "city", "visit_date", "exhibition", "ticket", "stay_minutes", "spent"];
    const values = generateRows()
      .map((r) => `(${cols.map((c) => sqlString(r[c])).join(",")})`)
      .join(",\n");
    return `CREATE TABLE visitors (
  id INTEGER PRIMARY KEY, name TEXT, age INTEGER, city TEXT, visit_date TEXT,
  exhibition TEXT, ticket TEXT, stay_minutes INTEGER, spent INTEGER
);
INSERT INTO visitors VALUES
${values};`;
  }

  const PRACTICE = {
    title: "연습: 방문 기록 조사",
    intro:
      "반장님이 신입 훈련용으로 하늘미술관의 <b>올해 방문 기록</b>을 내주었습니다. 기록이 600건이 넘어서 눈으로는 찾을 수 없어요. <code>SELECT</code>와 <code>WHERE</code>로 필요한 기록만 골라내세요.",
    buildSQL,
    tables: [
      {
        name: "visitors",
        label: "방문 기록 (600여 건)",
        columns: [
          ["id", "번호"],
          ["name", "이름"],
          ["age", "나이"],
          ["city", "사는 도시"],
          ["visit_date", "방문일 (YYYY-MM-DD)"],
          ["exhibition", "관람한 전시"],
          ["ticket", "티켓 종류"],
          ["stay_minutes", "머문 시간 (분)"],
          ["spent", "기념품샵 지출 (원)"],
        ],
      },
    ],
    problems: [
      {
        id: "p1",
        title: "기록 훑어보기",
        concept: "열 고르기",
        lesson: "행이 많을 때는 필요한 열만 골라야 읽기 편해요. 결과 표는 처음 200행만 보여 주지만, 정답 판정은 전체 행으로 합니다.",
        story: "먼저 기록이 어떻게 생겼는지 살펴봅시다.",
        task: "<code>visitors</code>에서 <b>이름(name)</b>, <b>도시(city)</b>, <b>방문일(visit_date)</b>만 조회하세요. (이 순서대로)",
        expected: "SELECT name, city, visit_date FROM visitors",
        hints: [
          "<code>SELECT 열1, 열2, 열3 FROM 테이블</code>",
          "테이블 이름은 <code>visitors</code>입니다.",
          "정답: <code>SELECT name, city, visit_date FROM visitors;</code>",
        ],
        solved: "기록이 날짜순으로 정리돼 있네요. 이제 조건으로 걸러 봅시다.",
      },
      {
        id: "p2",
        title: "부산에서 온 손님",
        concept: "WHERE =",
        lesson: "글자 값은 작은따옴표로 감싸고, 데이터와 <b>정확히 같아야</b> 해요. <code>'부산'</code>과 <code>'부산 '</code>(뒤에 공백)은 다른 값입니다.",
        story: "부산 지역 홍보 효과를 알아보려 합니다.",
        task: "<code>city</code>가 <b>'부산'</b>인 방문 기록을 모두(모든 열) 조회하세요.",
        expected: "SELECT * FROM visitors WHERE city = '부산'",
        hints: [
          "<code>WHERE 열 = '값'</code>",
          "<code>SELECT * FROM visitors WHERE city = ...</code>",
          "정답: <code>SELECT * FROM visitors WHERE city = '부산';</code>",
        ],
        solved: "결과 위의 행 수를 보세요. 부산에서 온 방문이 몇 건인지 바로 알 수 있어요.",
      },
      {
        id: "p3",
        title: "70세 이상 어르신",
        concept: "비교 연산자 >=",
        lesson: "숫자는 따옴표 없이 씁니다. <code>&gt;</code> 초과, <code>&gt;=</code> 이상, <code>&lt;</code> 미만, <code>&lt;=</code> 이하.",
        story: "어르신 전용 해설 프로그램을 만들까 합니다.",
        task: "<code>age</code>가 <b>70 이상</b>인 방문객의 <b>이름(name)</b>과 <b>나이(age)</b>를 조회하세요.",
        expected: "SELECT name, age FROM visitors WHERE age >= 70",
        hints: [
          "'이상'은 그 숫자를 포함해요: <code>&gt;=</code>",
          "<code>SELECT name, age FROM visitors WHERE age ...</code>",
          "정답: <code>SELECT name, age FROM visitors WHERE age &gt;= 70;</code>",
        ],
        solved: "숫자 비교 완료!",
      },
      {
        id: "p4",
        title: "서울 밖에서 온 사람",
        concept: "같지 않다 <>",
        lesson: "'같지 않다'는 <code>&lt;&gt;</code> 또는 <code>!=</code>로 씁니다. 둘 다 같은 뜻이에요.",
        story: "지방에서 온 방문객 비율이 궁금합니다.",
        task: "<code>city</code>가 <b>'서울'이 아닌</b> 방문객의 <b>이름(name)</b>과 <b>도시(city)</b>를 조회하세요.",
        expected: "SELECT name, city FROM visitors WHERE city <> '서울'",
        hints: [
          "'아니다'는 <code>&lt;&gt;</code> 기호예요.",
          "<code>WHERE city &lt;&gt; '...'</code>",
          "정답: <code>SELECT name, city FROM visitors WHERE city &lt;&gt; '서울';</code>",
        ],
        solved: "서울이 아닌 기록이 훨씬 많네요.",
      },
      {
        id: "p5",
        title: "체험관의 어린 손님",
        concept: "AND",
        lesson: "<code>AND</code>로 이은 조건은 <b>모두</b> 만족해야 남아요. 조건이 늘수록 결과는 줄어듭니다.",
        story: "어린이 체험관에 10세 미만 아이들이 얼마나 오는지 확인합니다.",
        task: "<code>exhibition</code>이 <b>'어린이 체험관'</b>이고 <code>age</code>가 <b>10 미만</b>인 방문객의 <b>이름</b>과 <b>나이</b>를 조회하세요.",
        expected: "SELECT name, age FROM visitors WHERE exhibition = '어린이 체험관' AND age < 10",
        hints: [
          "두 조건을 <code>AND</code>로 연결하세요.",
          "'미만'은 그 숫자를 포함하지 않아요: <code>&lt;</code>",
          "정답: <code>SELECT name, age FROM visitors WHERE exhibition = '어린이 체험관' AND age &lt; 10;</code>",
        ],
        solved: "AND는 '그리고'. 두 조건을 다 만족하는 기록만 남았어요.",
      },
      {
        id: "p6",
        title: "대구 또는 울산",
        concept: "OR",
        lesson: "<code>OR</code>로 이은 조건은 <b>하나만</b> 만족해도 남아요. <code>city = '대구' OR city = '울산'</code>처럼 열 이름을 매번 써야 합니다.",
        story: "대구·울산 지역 학교에 단체 관람 안내문을 보내려 합니다.",
        task: "<code>city</code>가 <b>'대구' 또는 '울산'</b>인 방문객의 <b>이름</b>과 <b>도시</b>를 조회하세요.",
        expected: "SELECT name, city FROM visitors WHERE city = '대구' OR city = '울산'",
        hints: [
          "'또는'은 <code>OR</code>입니다.",
          "<code>city = '대구' OR '울산'</code>은 틀린 식이에요. 열 이름을 두 번 쓰세요.",
          "정답: <code>SELECT name, city FROM visitors WHERE city = '대구' OR city = '울산';</code>",
        ],
        solved: "OR는 '또는'. AND와 달리 조건을 더할수록 결과가 늘어나요.",
      },
      {
        id: "p7",
        title: "충청권 방문객",
        concept: "IN",
        lesson: "OR가 길어지면 <code>IN</code>으로 줄일 수 있어요. <code>city IN ('대전', '세종', '청주')</code>는 세 도시 중 하나라는 뜻입니다.",
        story: "이번엔 대전, 세종, 청주 세 도시입니다. OR를 세 번 쓰는 대신 더 짧게 써 봅시다.",
        task: "<code>city</code>가 <b>'대전', '세종', '청주'</b> 중 하나인 방문객의 <b>이름</b>과 <b>도시</b>를 조회하세요.",
        expected: "SELECT name, city FROM visitors WHERE city IN ('대전', '세종', '청주')",
        hints: [
          "<code>열 IN (값1, 값2, 값3)</code>",
          "값마다 작은따옴표, 사이에는 쉼표.",
          "정답: <code>SELECT name, city FROM visitors WHERE city IN ('대전', '세종', '청주');</code>",
        ],
        solved: "IN을 쓰면 OR 여러 개를 한 번에! (OR로 써도 정답이에요.)",
      },
      {
        id: "p8",
        title: "9월 한 달",
        concept: "BETWEEN",
        lesson: "범위는 <code>BETWEEN A AND B</code>로 씁니다. A와 B를 <b>포함</b>해요. 날짜가 <code>'2026-09-01'</code> 형식의 글자라서 크기 비교가 그대로 됩니다.",
        story: "9월 방문 기록으로 가을 특별 행사 효과를 봅니다.",
        task: "<code>visit_date</code>가 <b>2026년 9월(9월 1일 ~ 9월 30일)</b>인 방문의 <b>이름</b>, <b>방문일</b>, <b>전시(exhibition)</b>를 조회하세요.",
        expected: "SELECT name, visit_date, exhibition FROM visitors WHERE visit_date BETWEEN '2026-09-01' AND '2026-09-30'",
        hints: [
          "<code>WHERE visit_date BETWEEN '시작' AND '끝'</code>",
          "날짜도 작은따옴표로 감싸요: <code>'2026-09-01'</code>",
          "정답: <code>SELECT name, visit_date, exhibition FROM visitors WHERE visit_date BETWEEN '2026-09-01' AND '2026-09-30';</code>",
        ],
        solved: "<code>visit_date &gt;= '2026-09-01' AND visit_date &lt;= '2026-09-30'</code>과 같은 결과예요.",
      },
      {
        id: "p9",
        title: "기념품샵의 큰손 학생",
        concept: "AND + 숫자 비교",
        lesson: "글자 조건과 숫자 조건을 함께 쓸 수 있어요. 글자는 따옴표, 숫자는 따옴표 없이.",
        story: "학생 할인 상품을 기획하려고 합니다.",
        task: "<code>ticket</code>이 <b>'학생'</b>이고 <code>spent</code>가 <b>50000 이상</b>인 방문의 <b>이름</b>, <b>나이</b>, <b>지출(spent)</b>을 조회하세요.",
        expected: "SELECT name, age, spent FROM visitors WHERE ticket = '학생' AND spent >= 50000",
        hints: [
          "조건 두 개: 티켓 종류, 지출 금액.",
          "금액은 쉼표 없이 숫자로: <code>50000</code>",
          "정답: <code>SELECT name, age, spent FROM visitors WHERE ticket = '학생' AND spent &gt;= 50000;</code>",
        ],
        solved: "학생인데 5만 원 넘게 쓴 방문객들을 찾았어요.",
      },
      {
        id: "p10",
        title: "인천에서 온 김씨",
        concept: "LIKE",
        lesson: "<code>LIKE</code>는 글자 <b>패턴</b>을 찾아요. <code>%</code>는 '아무 글자나 몇 개든'이라는 뜻. <code>name LIKE '김%'</code>는 '김'으로 시작하는 이름입니다.",
        story: "인천에서 온 김씨 성 방문객에게 전시 안내 문자를 보내려 합니다.",
        task: "<code>name</code>이 <b>'김'으로 시작</b>하고 <code>city</code>가 <b>'인천'</b>인 방문객의 <b>이름</b>과 <b>도시</b>를 조회하세요.",
        expected: "SELECT name, city FROM visitors WHERE name LIKE '김%' AND city = '인천'",
        hints: [
          "'김'으로 시작 = <code>'김%'</code>",
          "<code>WHERE name LIKE '김%' AND ...</code>",
          "정답: <code>SELECT name, city FROM visitors WHERE name LIKE '김%' AND city = '인천';</code>",
        ],
        solved: "<code>'%수'</code>는 '수'로 끝나는 이름, <code>'%지%'</code>는 '지'가 들어간 이름이에요.",
      },
      {
        id: "p11",
        title: "가장 오래 머문 사람들",
        concept: "WHERE + ORDER BY DESC",
        lesson: "<code>ORDER BY 열 DESC</code>는 큰 값부터 정렬합니다. <code>WHERE</code>로 먼저 거른 다음 정렬해요.",
        story: "전시에 푹 빠진 방문객들은 어떤 사람들일까요?",
        task: "<code>stay_minutes</code>가 <b>200 이상</b>인 방문의 <b>이름</b>과 <b>머문 시간(stay_minutes)</b>을 조회하고, <b>머문 시간이 긴 순서</b>로 정렬하세요.",
        expected: "SELECT name, stay_minutes FROM visitors WHERE stay_minutes >= 200 ORDER BY stay_minutes DESC",
        ordered: { column: 1, desc: true },
        hints: [
          "순서: <code>SELECT → FROM → WHERE → ORDER BY</code>",
          "긴 순서 = 큰 값부터 = <code>DESC</code>",
          "정답: <code>SELECT name, stay_minutes FROM visitors WHERE stay_minutes &gt;= 200 ORDER BY stay_minutes DESC;</code>",
        ],
        solved: "220분, 거의 4시간이나 머문 사람도 있네요.",
      },
      {
        id: "p12",
        title: "분실물의 주인",
        concept: "조건 4개 종합",
        lesson: "단서를 하나씩 조건으로 바꿔 <code>AND</code>로 이으세요. 결과가 2행 이상이면 아직 쓰지 않은 단서가 있는 거예요.",
        story:
          "안내데스크에 지갑이 맡겨졌습니다. 안에는 <b>수원</b>에 사는 사람의 교통카드, <b>2026년 8월 15일</b> <b>현대 조각전</b> 입장권, 그리고 기념품샵 영수증 <b>32,000원</b>이 들어 있었어요.",
        task: "모든 단서를 만족하는 방문 기록을 찾아 <b>모든 열</b>을 조회하세요.",
        expected: "SELECT * FROM visitors WHERE city = '수원' AND visit_date = '2026-08-15' AND exhibition = '현대 조각전' AND spent = 32000",
        hints: [
          "단서는 네 개예요: 도시, 방문일, 전시, 지출 금액.",
          "날짜는 <code>'2026-08-15'</code>, 금액은 <code>32000</code> (쉼표 없이).",
          "정답: <code>SELECT * FROM visitors WHERE city = '수원' AND visit_date = '2026-08-15' AND exhibition = '현대 조각전' AND spent = 32000;</code>",
        ],
        solved: "지갑의 주인은 <b>배수아</b> 학생! 600여 건 중에서 단 한 명을 찾아냈어요. 훈련 끝, 수고했어요 수사관!",
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = PRACTICE;
  else root.PRACTICE = PRACTICE;
})(typeof window !== "undefined" ? window : globalThis);
