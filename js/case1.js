// 1장: 하늘미술관 도난 사건
// 미션마다 expected 쿼리의 결과와 학생 쿼리의 결과를 비교해 정답을 판정한다.
// ordered: true 인 미션만 행 순서까지 비교한다.

window.CASE = {
  id: "case1",
  title: "하늘미술관 도난 사건",
  intro: [
    "11월 14일 밤, 하늘미술관의 대표 작품 <b>「새벽의 강」</b>이 사라졌습니다.",
    "당신은 오늘 처음 출근한 신입 수사관. 반장님이 미술관 데이터베이스 접속 권한을 건네며 말합니다.",
    "<q>증거는 전부 데이터 안에 있어. SQL로 하나씩 찾아내 봐.</q>",
  ],

  schemaSQL: `
CREATE TABLE people (
  id INTEGER PRIMARY KEY, name TEXT, role TEXT, age INTEGER
);
INSERT INTO people VALUES
  (1,'김도윤','경비원',52),
  (2,'이서연','큐레이터',34),
  (3,'박준호','청소 직원',47),
  (4,'최유나','관람객',23),
  (5,'정민재','관람객',41),
  (6,'한지우','관람객',29),
  (7,'오세진','관람객',36),
  (8,'윤하린','기념품샵 직원',26),
  (9,'강태오','관람객',31),
  (10,'송미래','관장',58);

CREATE TABLE cctv (
  id INTEGER PRIMARY KEY, camera TEXT, time TEXT, description TEXT
);
INSERT INTO cctv VALUES
  (1,'정문','18:02','관람객 입장 시작'),
  (2,'기념품샵','19:12','검은 모자를 쓴 사람이 계산대에서 결제'),
  (3,'전시실1','19:30','관람객 여러 명이 조각 작품을 감상'),
  (4,'전시실2','21:58','경비원이 순찰 중. 이상 없음'),
  (5,'정문','22:00','폐관. 정문 셔터가 내려감'),
  (6,'전시실1','22:30','이상 없음'),
  (7,'전시실2','22:47','검은 모자를 쓴 사람이 「새벽의 강」 액자를 떼어냄'),
  (8,'복도','22:50','검은 모자를 쓴 사람이 큰 가방을 들고 비상구 쪽으로 이동'),
  (9,'비상구','22:53','카메라 화면이 3분간 꺼짐'),
  (10,'주차장','22:58','회색 승합차가 빠르게 출발');

CREATE TABLE entry_log (
  id INTEGER PRIMARY KEY, person_id INTEGER, entered_at TEXT,
  exit_gate TEXT, exited_at TEXT
);
INSERT INTO entry_log VALUES
  (1,4,'18:20','정문','20:15'),
  (2,5,'18:45','정문','21:40'),
  (3,6,'19:05','비상구','22:54'),
  (4,7,'18:30','정문','21:55'),
  (5,9,'19:00','비상구','22:55'),
  (6,1,'17:00','정문','23:30'),
  (7,3,'17:30','비상구','22:20'),
  (8,2,'09:00','정문','22:10'),
  (9,8,'10:00','정문','21:00'),
  (10,10,'09:30','정문','18:00');

CREATE TABLE card_payments (
  id INTEGER PRIMARY KEY, person_id INTEGER, place TEXT, item TEXT,
  amount INTEGER, paid_at TEXT
);
INSERT INTO card_payments VALUES
  (1,4,'카페','아메리카노',4500,'18:40'),
  (2,7,'기념품샵','엽서 세트',8000,'19:05'),
  (3,9,'기념품샵','검은 모자',25000,'19:12'),
  (4,5,'카페','케이크',6500,'19:50'),
  (5,6,'기념품샵','에코백',15000,'20:30'),
  (6,6,'카페','라떼',5000,'21:10'),
  (7,9,'카페','생수',1500,'22:15'),
  (8,4,'기념품샵','검은 모자',25000,'19:40');
`,

  tables: [
    {
      name: "people",
      label: "관련자",
      columns: [
        ["id", "번호"],
        ["name", "이름"],
        ["role", "역할"],
        ["age", "나이"],
      ],
    },
    {
      name: "cctv",
      label: "CCTV 기록",
      columns: [
        ["id", "번호"],
        ["camera", "카메라 위치"],
        ["time", "시각 (HH:MM)"],
        ["description", "화면 내용"],
      ],
    },
    {
      name: "entry_log",
      label: "출입 기록",
      columns: [
        ["id", "번호"],
        ["person_id", "사람 번호 → people.id"],
        ["entered_at", "들어온 시각"],
        ["exit_gate", "나간 문"],
        ["exited_at", "나간 시각"],
      ],
    },
    {
      name: "card_payments",
      label: "카드 결제",
      columns: [
        ["id", "번호"],
        ["person_id", "사람 번호 → people.id"],
        ["place", "결제 장소"],
        ["item", "구매 물품"],
        ["amount", "금액 (원)"],
        ["paid_at", "결제 시각"],
      ],
    },
  ],

  missions: [
    {
      id: "m1",
      title: "사건 현장의 눈",
      concept: "SELECT * FROM",
      lesson:
        "<code>SELECT * FROM 테이블</code>은 테이블의 <b>모든 열과 모든 행</b>을 보여 줍니다. <code>*</code>는 '전부'라는 뜻이에요.",
      story: "먼저 미술관 CCTV 기록부터 훑어봅시다.",
      task: "<code>cctv</code> 테이블의 모든 기록을 조회하세요.",
      expected: "SELECT * FROM cctv",
      hints: [
        "모든 열을 가져올 때는 <code>*</code>를 씁니다.",
        "형식: <code>SELECT * FROM 테이블이름</code>",
        "정답: <code>SELECT * FROM cctv;</code>",
      ],
      solved:
        "22시 47분, 전시실2에서 <b>검은 모자를 쓴 사람</b>이 그림을 떼어 냈습니다. 그리고 비상구 카메라가 3분간 꺼졌어요.",
    },
    {
      id: "m2",
      title: "관련자 명단",
      concept: "원하는 열만 고르기",
      lesson:
        "<code>*</code> 대신 열 이름을 쉼표로 나열하면 <b>필요한 열만</b> 볼 수 있어요. 예: <code>SELECT name, age FROM people</code>",
      story: "그날 밤 미술관에 있던 사람들을 알아야 합니다.",
      task: "<code>people</code> 테이블에서 <b>이름(name)</b>과 <b>역할(role)</b>만 조회하세요. (이 순서대로)",
      expected: "SELECT name, role FROM people",
      hints: [
        "<code>*</code> 자리에 보고 싶은 열 이름을 적습니다.",
        "열이 여러 개면 쉼표(,)로 구분해요: <code>SELECT 열1, 열2 FROM ...</code>",
        "정답: <code>SELECT name, role FROM people;</code>",
      ],
      solved: "직원 5명과 관람객 5명. 이 중에 범인이 있을까요?",
    },
    {
      id: "m3",
      title: "범행 시각의 전시실",
      concept: "WHERE (조건)",
      lesson:
        "<code>WHERE</code> 뒤에 조건을 쓰면 <b>조건에 맞는 행만</b> 남습니다. 글자(문자열)는 작은따옴표로 감싸요: <code>WHERE camera = '정문'</code>",
      story: "도난 현장인 전시실2의 기록만 따로 보고 싶습니다.",
      task: "<code>cctv</code> 테이블에서 <code>camera</code>가 <b>'전시실2'</b>인 기록만 모두 조회하세요.",
      expected: "SELECT * FROM cctv WHERE camera = '전시실2'",
      hints: [
        "조건은 <code>FROM 테이블</code> 다음에 <code>WHERE</code>로 씁니다.",
        "글자 값은 작은따옴표로: <code>WHERE camera = '...'</code>",
        "정답: <code>SELECT * FROM cctv WHERE camera = '전시실2';</code>",
      ],
      solved:
        "21시 58분 순찰 때는 이상이 없었습니다. 그림은 <b>21:58 ~ 22:47 사이</b>에 사라졌어요.",
    },
    {
      id: "m4",
      title: "비상구로 나간 사람들",
      concept: "WHERE 연습",
      lesson:
        "<code>WHERE</code>는 어떤 테이블에서도 쓸 수 있어요. 열 이름이 정확한지 오른쪽 <b>테이블 구조</b>에서 확인하세요.",
      story: "범인은 비상구 쪽으로 갔습니다. 출입 기록을 확인해 봅시다.",
      task: "<code>entry_log</code> 테이블에서 <code>exit_gate</code>가 <b>'비상구'</b>인 기록을 모두 조회하세요.",
      expected: "SELECT * FROM entry_log WHERE exit_gate = '비상구'",
      hints: [
        "3번 미션과 같은 방식이에요. 테이블과 열 이름만 바뀝니다.",
        "<code>SELECT * FROM entry_log WHERE exit_gate = ...</code>",
        "정답: <code>SELECT * FROM entry_log WHERE exit_gate = '비상구';</code>",
      ],
      solved:
        "비상구로 나간 사람은 3명. 그런데 한 명은 범행 시각보다 훨씬 일찍 나갔네요.",
    },
    {
      id: "m5",
      title: "범행 이후에 나간 사람",
      concept: "AND, 비교 연산자",
      lesson:
        "조건 두 개를 모두 만족해야 할 때는 <code>AND</code>로 잇습니다. <code>&gt;=</code>는 '이상'이에요. 시각이 <code>'22:47'</code> 같은 글자로 저장돼 있어서 크기 비교도 그대로 됩니다.",
      story: "그림이 사라진 22:47 이후에 비상구로 나간 사람만 추려 봅시다.",
      task: "<code>entry_log</code>에서 <code>exit_gate</code>가 '비상구'<b>이고</b> <code>exited_at</code>이 <b>'22:47' 이후(같거나 늦음)</b>인 기록을 모두 조회하세요.",
      expected:
        "SELECT * FROM entry_log WHERE exit_gate = '비상구' AND exited_at >= '22:47'",
      hints: [
        "조건 두 개를 <code>AND</code>로 연결하세요.",
        "'같거나 늦음'은 <code>&gt;=</code> 입니다: <code>exited_at &gt;= '22:47'</code>",
        "정답: <code>SELECT * FROM entry_log WHERE exit_gate = '비상구' AND exited_at &gt;= '22:47';</code>",
      ],
      solved:
        "용의자는 <b>person_id 6번과 9번</b> 두 사람으로 좁혀졌습니다. 그런데 번호만으로는 누군지 모르겠네요.",
    },
    {
      id: "m6",
      title: "기념품샵 영수증",
      concept: "ORDER BY (정렬)",
      lesson:
        "<code>ORDER BY 열</code>을 쓰면 그 열을 기준으로 <b>정렬</b>합니다. 기본은 오름차순(작은 것부터), 거꾸로는 <code>DESC</code>를 붙여요.",
      story:
        "19:12 기념품샵 CCTV에 검은 모자를 쓴 사람이 찍혔습니다. 기념품샵 결제 내역을 시간 순서대로 봅시다.",
      task: "<code>card_payments</code>에서 <code>place</code>가 '기념품샵'인 결제를 모두 조회하고, <code>paid_at</code> <b>이른 시각부터</b> 정렬하세요.",
      expected:
        "SELECT * FROM card_payments WHERE place = '기념품샵' ORDER BY paid_at",
      ordered: true,
      hints: [
        "<code>WHERE</code> 다음에 <code>ORDER BY</code>를 씁니다.",
        "이른 시각부터 = 오름차순 = <code>ORDER BY paid_at</code>",
        "정답: <code>SELECT * FROM card_payments WHERE place = '기념품샵' ORDER BY paid_at;</code>",
      ],
      solved:
        "<b>검은 모자</b>를 산 사람이 두 명이에요! person_id 9번(19:12)과 4번(19:40).",
    },
    {
      id: "m7",
      title: "번호 대신 이름으로",
      concept: "JOIN (테이블 연결)",
      lesson:
        "<code>entry_log.person_id</code>는 <code>people.id</code>를 가리킵니다. <code>JOIN ... ON</code>으로 두 테이블을 이어 붙이면 번호 대신 이름을 볼 수 있어요.<br><code>FROM entry_log JOIN people ON entry_log.person_id = people.id</code>",
      story: "5번 미션의 두 용의자, 이름이 뭘까요?",
      task: "22:47 이후 비상구로 나간 사람의 <b>이름(people.name)</b>과 <b>나간 시각(entry_log.exited_at)</b>을 조회하세요. (이 순서대로)",
      expected:
        "SELECT people.name, entry_log.exited_at FROM entry_log JOIN people ON entry_log.person_id = people.id WHERE entry_log.exit_gate = '비상구' AND entry_log.exited_at >= '22:47'",
      hints: [
        "두 테이블에 같은 이름의 열이 있을 수 있으니 <code>테이블.열</code> 형식으로 쓰면 안전해요.",
        "<code>SELECT people.name, entry_log.exited_at FROM entry_log JOIN people ON entry_log.person_id = people.id WHERE ...</code>",
        "정답: <code>SELECT people.name, entry_log.exited_at FROM entry_log JOIN people ON entry_log.person_id = people.id WHERE exit_gate = '비상구' AND exited_at &gt;= '22:47';</code>",
      ],
      solved: "용의자는 <b>한지우</b>(22:54)와 <b>강태오</b>(22:55)입니다.",
    },
    {
      id: "m8",
      title: "검은 모자의 주인",
      concept: "JOIN + WHERE",
      lesson:
        "JOIN한 결과에도 <code>WHERE</code>를 붙일 수 있어요. 이번엔 <code>card_payments</code>와 <code>people</code>을 연결합니다.",
      story: "마지막 단서입니다. 검은 모자를 산 사람의 이름을 확인하세요.",
      task: "<code>item</code>이 '검은 모자'인 결제의 <b>구매자 이름(people.name)</b>과 <b>결제 시각(card_payments.paid_at)</b>을 조회하세요. (이 순서대로)",
      expected:
        "SELECT people.name, card_payments.paid_at FROM card_payments JOIN people ON card_payments.person_id = people.id WHERE card_payments.item = '검은 모자'",
      hints: [
        "7번 미션과 같은 모양이에요. 테이블만 <code>card_payments</code>로 바뀝니다.",
        "<code>... FROM card_payments JOIN people ON card_payments.person_id = people.id WHERE item = '검은 모자'</code>",
        "정답: <code>SELECT people.name, card_payments.paid_at FROM card_payments JOIN people ON card_payments.person_id = people.id WHERE item = '검은 모자';</code>",
      ],
      solved:
        "검은 모자를 산 사람은 <b>강태오</b>와 <b>최유나</b>. 이제 지금까지의 단서를 모아 범인을 지목할 시간입니다.",
    },
  ],

  accusation: {
    question: "「새벽의 강」을 훔친 사람은 누구일까요?",
    answer: "강태오",
    wrong: {
      최유나:
        "최유나는 검은 모자를 샀지만 20:15에 <b>정문</b>으로 나갔어요. 범행 시각(22:47)에는 미술관에 없었습니다.",
      한지우:
        "한지우는 22:54에 비상구로 나갔지만 <b>검은 모자를 산 기록이 없어요</b>. CCTV 속 범인은 검은 모자를 쓰고 있었죠.",
      박준호:
        "박준호는 비상구로 나갔지만 <b>22:20</b>, 범행 시각보다 이전이에요.",
    },
    wrongDefault:
      "이 사람은 22:47 이후 비상구로 나가지도, 검은 모자를 사지도 않았어요. 7번과 8번 미션의 결과를 다시 비교해 보세요.",
    ending:
      "정답! 범행 시각 이후 비상구로 나간 사람(한지우, 강태오)과 검은 모자를 산 사람(강태오, 최유나)이 <b>겹치는 단 한 사람</b>, 강태오가 범인입니다.",
    teaser:
      "그런데… 강태오와 거의 같은 시각에 비상구로 나간 한지우는 누구일까요? 주차장의 회색 승합차는? <b>2장: 공범을 찾아라</b> (GROUP BY, 서브쿼리)가 곧 이어집니다.",
  },
};
