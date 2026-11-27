// 쿼리 검사, 결과 비교, 오류 번역 — DOM에 의존하지 않는 순수 함수들
(function (root) {
  "use strict";

  /** 주석과 문자열 밖의 내용만 남긴다 (키워드 검사용) */
  function stripLiteralsAndComments(sql) {
    return sql
      .replace(/--[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/'(?:[^']|'')*'/g, "''")
      .replace(/"(?:[^"]|"")*"/g, '""');
  }

  /**
   * 조사용으로 허용되는 쿼리인지 검사한다.
   * 문제가 있으면 학생에게 보여 줄 메시지를, 괜찮으면 null을 돌려준다.
   */
  function validateQuery(sql) {
    const bare = stripLiteralsAndComments(sql).trim();
    if (!bare) return "쿼리를 입력하세요.";

    const statements = bare.split(";").filter((s) => s.trim());
    if (statements.length > 1) {
      return "한 번에 쿼리 하나만 실행할 수 있어요. 세미콜론(;) 뒤의 내용을 지우세요.";
    }
    const first = statements[0].trim().split(/\s+/)[0].toUpperCase();
    if (first !== "SELECT" && first !== "WITH") {
      return `수사 기록은 읽기만 할 수 있어요. 쿼리는 SELECT로 시작해야 합니다. (지금은 ${first})`;
    }
    return null;
  }

  /** SQLite 영어 오류를 학생용 한국어 설명으로 바꾼다 */
  function translateError(message) {
    const msg = String(message || "");
    let m;
    if ((m = msg.match(/no such table: (\S+)/))) {
      return `'${m[1]}'라는 테이블이 없어요. 오른쪽 테이블 구조에서 이름을 확인하세요. (철자, 밑줄 _ 주의)`;
    }
    if ((m = msg.match(/no such column: (\S+)/))) {
      return `'${m[1]}'라는 열이 없어요. 열 이름 철자를 확인하세요. 글자 값이라면 작은따옴표로 감싸야 합니다. 예: '전시실2'`;
    }
    if ((m = msg.match(/ambiguous column name: (\S+)/))) {
      return `'${m[1]}' 열이 두 테이블에 모두 있어서 어느 쪽인지 모호해요. people.${m[1]} 처럼 테이블 이름을 앞에 붙이세요.`;
    }
    if ((m = msg.match(/near "([^"]*)": syntax error/))) {
      return `'${m[1]}' 근처에 문법 오류가 있어요. 키워드 철자, 쉼표, 순서(SELECT → FROM → WHERE → ORDER BY)를 확인하세요.`;
    }
    if (/incomplete input/.test(msg)) {
      return "쿼리가 끝나지 않았어요. 작은따옴표(')나 괄호가 제대로 닫혔는지, 마지막 조건이 빠지지 않았는지 확인하세요.";
    }
    if (/unrecognized token/.test(msg)) {
      return "알 수 없는 기호가 있어요. 따옴표는 작은따옴표(')를 쓰고, 한글 입력 상태에서 쓴 기호가 없는지 확인하세요.";
    }
    return `SQL 오류: ${msg}`;
  }

  /** db.exec 결과를 { columns, rows } 하나로 정리한다 */
  function normalize(execResult) {
    if (!execResult || execResult.length === 0) return { columns: [], rows: [] };
    const last = execResult[execResult.length - 1];
    return { columns: last.columns, rows: last.values };
  }

  function rowKey(row) {
    return JSON.stringify(row.map((v) => (v === null ? null : String(v))));
  }

  /**
   * 학생 결과와 정답 결과를 비교한다. 열 이름(별칭)은 비교하지 않고 값만 본다.
   * @returns {{ ok: boolean, message: string }}
   */
  function compareResults(actual, expected, ordered) {
    const ex = expected.rows;
    const ac = actual.rows;
    const exCols = expected.columns.length;

    if (ac.length === 0 && ex.length > 0) {
      return { ok: false, message: "결과가 한 줄도 없어요. 조건의 값(철자, 띄어쓰기)이 데이터와 똑같은지 확인하세요." };
    }
    if (actual.columns.length !== exCols) {
      return {
        ok: false,
        message: `열이 ${actual.columns.length}개예요. 이 미션에서는 ${exCols}개의 열이 필요해요.`,
      };
    }
    if (ac.length !== ex.length) {
      const more = ac.length > ex.length;
      return {
        ok: false,
        message: `결과가 ${ac.length}행이에요. ${more ? "아직 더 걸러 내야 해요. 조건을 확인하세요." : "너무 많이 걸러 냈어요. 조건이 너무 엄격하지 않은지 확인하세요."}`,
      };
    }

    const acKeys = ac.map(rowKey);
    const exKeys = ex.map(rowKey);
    const sameSet =
      JSON.stringify([...acKeys].sort()) === JSON.stringify([...exKeys].sort());

    if (!sameSet) {
      const sameIgnoringColumnOrder =
        JSON.stringify(ac.map((r) => rowKey([...r].map(String).sort())).sort()) ===
        JSON.stringify(ex.map((r) => rowKey([...r].map(String).sort())).sort());
      return {
        ok: false,
        message: sameIgnoringColumnOrder
          ? "내용은 맞는데 열 순서가 달라요. 미션에 적힌 순서대로 열을 나열하세요."
          : "행 수는 맞지만 내용이 달라요. 어떤 열을 고르는지, 조건이 맞는지 다시 보세요.",
      };
    }
    if (ordered && JSON.stringify(acKeys) !== JSON.stringify(exKeys)) {
      return { ok: false, message: "내용은 맞는데 정렬 순서가 달라요. ORDER BY를 확인하세요." };
    }
    return { ok: true, message: "단서 확보!" };
  }

  const api = { validateQuery, translateError, normalize, compareResults };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
