// 화면 렌더링과 진행 상태 관리
(function () {
  "use strict";

  const CASE = window.CASE;
  const PRACTICE = window.PRACTICE;
  const { validateQuery, translateError, normalize, compareResults } = window.Engine;

  const STORAGE_KEY = `sqlDetective.${CASE.id}.v2`;
  const MAX_ROWS = 200;
  // 교사용: 주소 끝에 ?all=1 을 붙이면 모든 미션이 열린다
  const UNLOCK_ALL = new URLSearchParams(location.search).get("all") === "1";

  const $ = (sel) => document.querySelector(sel);
  const main = $("#main");

  let db = null; // 본편 사건 DB
  let practiceDb = null; // 연습 문제 DB (방문 기록 600여 건)
  const expected = {}; // 미션·연습 문제 id → 정답 결과
  let progress = loadProgress();
  let view = progress.seenIntro ? progress.lastView || firstOpenMission() : "intro";

  // ── 진행 상태 ─────────────────────────────

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === "object") {
        return { done: {}, queries: {}, hints: {}, ...saved };
      }
    } catch (_) { /* 손상된 저장값은 무시 */ }
    return { done: {}, queries: {}, hints: {}, seenIntro: false, caseSolved: false };
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_) { /* 시크릿 모드 등 저장 불가 — 진행은 계속 */ }
  }

  const missionIndex = (id) => CASE.missions.findIndex((m) => m.id === id);
  const practiceIndex = (id) => PRACTICE.problems.findIndex((p) => p.id === id);
  const isPractice = (id) => practiceIndex(id) >= 0;
  const practiceDoneCount = () => PRACTICE.problems.filter((p) => progress.done[p.id]).length;
  const doneCount = () => CASE.missions.filter((m) => progress.done[m.id]).length;
  const allDone = () => doneCount() === CASE.missions.length;

  function isUnlocked(id) {
    if (id === "intro" || UNLOCK_ALL || isPractice(id)) return true;
    if (id === "accuse") return allDone();
    const i = missionIndex(id);
    if (i < 0) return false;
    return i === 0 || Boolean(progress.done[CASE.missions[i - 1].id]);
  }

  function firstOpenMission() {
    const next = CASE.missions.find((m) => !progress.done[m.id]);
    return next ? next.id : "accuse";
  }

  // ── 공통 렌더링 ─────────────────────────────

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderProgress() {
    const solved = progress.caseSolved ? " · 사건 해결" : "";
    $("#progress").textContent = `단서 ${doneCount()} / ${CASE.missions.length}${solved}`;
  }

  function renderNav() {
    const lastSession = CASE.sessions[CASE.sessions.length - 1].number;
    $("#mission-list").innerHTML = CASE.sessions
      .map((session) => {
        const items = CASE.missions
          .filter((m) => m.session === session.number)
          .map((m) => {
            const i = missionIndex(m.id);
            const done = progress.done[m.id];
            const status = done ? "✓" : isUnlocked(m.id) ? String(i + 1) : "🔒";
            const label = done ? "완료" : isUnlocked(m.id) ? "" : "잠김";
            return navItem(m.id, status, m.title, m.concept, done, label);
          });
        if (session.number === lastSession) {
          const accuseStatus = progress.caseSolved ? "✓" : isUnlocked("accuse") ? "!" : "🔒";
          items.push(navItem("accuse", accuseStatus, "범인 지목", "모든 단서 종합", progress.caseSolved,
            isUnlocked("accuse") ? "" : "잠김"));
        }
        const done = CASE.missions.filter((m) => m.session === session.number && progress.done[m.id]).length;
        const total = CASE.missions.filter((m) => m.session === session.number).length;
        return `<section class="session">
          <h3 class="session-title">${escapeHTML(session.title)} <span>${done}/${total}</span></h3>
          <ol class="mission-list">${items.join("")}</ol>
        </section>`;
      })
      .join("") + renderPracticeNav();
  }

  function renderPracticeNav() {
    const chips = PRACTICE.problems
      .map((p, i) => {
        const done = progress.done[p.id];
        const current = view === p.id ? ' aria-current="step"' : "";
        return `<li><button type="button" class="practice-chip${done ? " is-done" : ""}" data-view="${p.id}"${current}
          title="${escapeHTML(p.title)}" aria-label="연습 ${i + 1}: ${escapeHTML(p.title)}${done ? " (완료)" : ""}">${done ? "✓" : i + 1}</button></li>`;
      })
      .join("");
    return `<section class="session practice-nav">
      <h3 class="session-title">자유 연습 · 방문 기록 <span>${practiceDoneCount()}/${PRACTICE.problems.length}</span></h3>
      <p class="practice-nav-help">600여 건 데이터로 SELECT·WHERE 연습. 언제든 풀 수 있어요.</p>
      <ol class="practice-chips">${chips}</ol>
    </section>`;
  }

  function navItem(id, status, title, concept, done, srLabel) {
    const current = view === id ? ' aria-current="step"' : "";
    const disabled = isUnlocked(id) ? "" : " disabled";
    const sr = srLabel ? `<span class="visually-hidden"> (${srLabel})</span>` : "";
    return `<li><button type="button" class="mission-link${done ? " is-done" : ""}" data-view="${id}"${current}${disabled}>
      <span class="mission-status" aria-hidden="true">${status}</span>
      <span>${escapeHTML(title)}${sr}<span class="mission-concept">${escapeHTML(concept)}</span></span>
    </button></li>`;
  }

  function renderSchema(tables) {
    $("#schema-list").innerHTML = tables
      .map(
        (t) => `<section class="schema-table">
          <h3><button type="button" class="insert-btn" data-insert="${t.name}" aria-label="${t.name} 입력">${t.name}</button><span>${escapeHTML(t.label)}</span></h3>
          <ul>${t.columns
            .map(([col, desc]) => `<li><button type="button" class="insert-btn" data-insert="${col}" aria-label="${col} 입력">${col}</button><span>${escapeHTML(desc)}</span></li>`)
            .join("")}</ul>
        </section>`
      )
      .join("");
  }

  function go(nextView, { focus = true } = {}) {
    view = nextView;
    if (view !== "intro") {
      progress.lastView = view;
      saveProgress();
    }
    renderNav();
    renderProgress();
    renderSchema(isPractice(view) ? PRACTICE.tables : CASE.tables);
    if (view === "intro") renderIntro();
    else if (view === "accuse") renderAccuse();
    else if (isPractice(view)) renderMission(PRACTICE.problems[practiceIndex(view)]);
    else renderMission(CASE.missions[missionIndex(view)]);
    if (focus) {
      const heading = main.querySelector("h1");
      if (heading) heading.focus();
    }
    window.scrollTo({ top: 0 });
  }

  // ── 인트로 ─────────────────────────────

  function renderIntro() {
    main.innerHTML = `
      <p class="eyebrow">사건 파일 #1</p>
      <h1 tabindex="-1">${escapeHTML(CASE.title)}</h1>
      <div class="card intro-lines">${CASE.intro.map((l) => `<p>${l}</p>`).join("")}</div>
      <div class="card">
        <p class="task-label">수사 방법</p>
        <ol class="how-to">
          <li>각 미션의 지시에 맞게 SQL 쿼리를 입력하고 <b>실행</b>을 누르세요. (단축키 <kbd>Ctrl</kbd>+<kbd>Enter</kbd>)</li>
          <li>결과가 맞으면 단서를 얻고 다음 미션이 열립니다.</li>
          <li>수사는 <b>3차시</b>, 차시마다 미션 3개씩 진행합니다. 진행 상황은 자동 저장돼요.</li>
          <li>막히면 <b>힌트</b>를 누르세요. 세 번째 힌트는 정답입니다.</li>
          <li>오른쪽 <b>테이블 구조</b>에서 테이블과 열 이름을 확인할 수 있어요.</li>
          <li>시간이 남으면 왼쪽 아래 <b>자유 연습</b>에서 600여 건의 방문 기록으로 더 연습할 수 있어요.</li>
        </ol>
      </div>
      <button type="button" class="btn btn-primary" id="start-btn">수사 시작 →</button>`;
    $("#start-btn").addEventListener("click", () => {
      progress.seenIntro = true;
      saveProgress();
      go(firstOpenMission());
    });
  }

  // ── 미션 ─────────────────────────────

  function renderMission(m) {
    const practice = isPractice(m.id);
    const eyebrow = practice
      ? `자유 연습 ${practiceIndex(m.id) + 1} / ${PRACTICE.problems.length} · ${escapeHTML(m.concept)}`
      : `${m.session}차시 · 미션 ${missionIndex(m.id) + 1} / ${CASE.missions.length} · ${escapeHTML(m.concept)}`;
    const practiceIntro = practice && practiceIndex(m.id) === 0
      ? `<div class="card intro-lines"><p>${PRACTICE.intro}</p></div>`
      : "";
    main.innerHTML = `
      <p class="eyebrow">${eyebrow}</p>
      <h1 tabindex="-1">${escapeHTML(m.title)}</h1>
      ${practiceIntro}
      <p class="story">${m.story}</p>

      <div class="card task">
        <p class="task-label">${practice ? "문제" : "미션"}</p>
        <p>${m.task}</p>
      </div>

      <details class="card lesson" ${progress.done[m.id] ? "" : "open"}>
        <summary>개념: ${escapeHTML(m.concept)}</summary>
        <p>${m.lesson}</p>
      </details>

      <label class="editor-label" for="editor">SQL 쿼리 <small>Ctrl+Enter로 실행</small></label>
      <textarea id="editor" class="editor" spellcheck="false" autocomplete="off" autocapitalize="off"
        placeholder="SELECT ..."></textarea>

      <div class="actions">
        <button type="button" class="btn btn-primary" id="run-btn">▶ 실행</button>
        <button type="button" class="btn" id="hint-btn"></button>
      </div>

      <div id="hints"></div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
      <div id="results"></div>
      <div id="solved" aria-live="polite"></div>`;

    const editor = $("#editor");
    editor.value = progress.queries[m.id] || "";
    editor.addEventListener("input", () => {
      progress.queries[m.id] = editor.value;
      saveProgress();
    });
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runQuery(m);
      }
    });
    $("#run-btn").addEventListener("click", () => runQuery(m));
    $("#hint-btn").addEventListener("click", () => {
      progress.hints[m.id] = Math.min((progress.hints[m.id] || 0) + 1, m.hints.length);
      saveProgress();
      renderHints(m);
    });
    renderHints(m);

    if (progress.done[m.id]) showSolved(m, { announce: false });
  }

  function renderHints(m) {
    const shown = progress.hints[m.id] || 0;
    $("#hints").innerHTML = m.hints
      .slice(0, shown)
      .map((h, i) => `<div class="note note-hint"><span class="note-icon">힌트 ${i + 1}</span><p>${h}</p></div>`)
      .join("");
    const btn = $("#hint-btn");
    btn.textContent = shown >= m.hints.length ? "힌트 모두 봄" : `힌트 보기 (${shown}/${m.hints.length})`;
    btn.disabled = shown >= m.hints.length;
  }

  function runQuery(m) {
    const sql = $("#editor").value;
    const feedback = $("#feedback");
    const problem = validateQuery(sql);
    if (problem) {
      feedback.innerHTML = note("error", "확인", escapeHTML(problem));
      $("#results").innerHTML = "";
      return;
    }

    let result;
    try {
      result = normalize((isPractice(m.id) ? practiceDb : db).exec(sql));
    } catch (err) {
      feedback.innerHTML = note("error", "오류", escapeHTML(translateError(err.message)));
      $("#results").innerHTML = "";
      return;
    }

    renderResults(result);
    const verdict = compareResults(result, expected[m.id], m.ordered);
    feedback.innerHTML = "";
    if (verdict.ok) {
      const firstTime = !progress.done[m.id];
      progress.done[m.id] = true;
      saveProgress();
      renderNav();
      renderProgress();
      showSolved(m, { announce: firstTime });
    } else if (progress.done[m.id]) {
      // 이미 푼 미션에서 다른 쿼리를 연습 중이면 판정 메시지만 보여 준다
      feedback.innerHTML = note("try", "참고", escapeHTML(verdict.message));
    } else {
      feedback.innerHTML = note("try", "아직", escapeHTML(verdict.message));
    }
  }

  function note(kind, label, html) {
    return `<div class="note note-${kind}"><span class="note-icon">${label}</span><p>${html}</p></div>`;
  }

  function showSolved(m, { announce }) {
    if (isPractice(m.id)) return showPracticeSolved(m, { announce });
    const i = missionIndex(m.id);
    const isLast = i === CASE.missions.length - 1;
    const nextId = isLast ? "accuse" : CASE.missions[i + 1].id;
    const session = CASE.sessions.find((s) => s.number === m.session);
    const endsSession = !isLast && CASE.missions[i + 1].session !== m.session;
    const nextLabel = isLast ? "범인 지목하러 가기 →" : endsSession ? `${m.session + 1}차시 시작 →` : "다음 미션 →";
    const sessionEnd = endsSession && session && session.ending
      ? `<p class="session-end"><b>■ ${escapeHTML(session.title)} 끝</b><br>${session.ending}</p>`
      : "";
    $("#solved").innerHTML = `
      <div class="solved">
        <p class="stamp">단서 확보</p>
        <p>${m.solved}</p>
        ${sessionEnd}
        <button type="button" class="btn btn-primary" id="next-btn">${nextLabel}</button>
      </div>`;
    $("#next-btn").addEventListener("click", () => go(nextId));
    if (announce) $("#next-btn").focus({ preventScroll: true });
  }

  function showPracticeSolved(m, { announce }) {
    const i = practiceIndex(m.id);
    const next = PRACTICE.problems[i + 1];
    const nextId = next ? next.id : firstOpenMission();
    const nextLabel = next ? "다음 연습 →" : "본편 수사로 돌아가기 →";
    $("#solved").innerHTML = `
      <div class="solved">
        <p class="stamp">정답</p>
        <p>${m.solved}</p>
        <button type="button" class="btn btn-primary" id="next-btn">${nextLabel}</button>
      </div>`;
    $("#next-btn").addEventListener("click", () => go(nextId));
    if (announce) $("#next-btn").focus({ preventScroll: true });
  }

  function renderResults({ columns, rows }) {
    const box = $("#results");
    if (columns.length === 0) {
      box.innerHTML = `<p class="result-meta">결과</p><div class="table-wrap"><p class="result-empty">조건에 맞는 행이 없습니다.</p></div>`;
      return;
    }
    const shown = rows.slice(0, MAX_ROWS);
    const more = rows.length > MAX_ROWS ? ` (처음 ${MAX_ROWS}행만 표시)` : "";
    const head = columns.map((c) => `<th scope="col">${escapeHTML(c)}</th>`).join("");
    const body = shown
      .map((r) => `<tr>${r.map((v) => (v === null
        ? '<td class="is-null">NULL</td>'
        : `<td>${escapeHTML(v)}</td>`)).join("")}</tr>`)
      .join("");
    box.innerHTML = `
      <p class="result-meta">결과 ${rows.length}행${more}</p>
      <div class="table-wrap"><table class="result-table">
        <caption class="visually-hidden">쿼리 결과</caption>
        <thead><tr>${head}</tr></thead><tbody>${body}</tbody>
      </table></div>`;
  }

  // ── 범인 지목 ─────────────────────────────

  function renderAccuse() {
    const { accusation } = CASE;
    const people = normalize(db.exec("SELECT name, role FROM people")).rows;
    main.innerHTML = `
      <p class="eyebrow">최종 추리</p>
      <h1 tabindex="-1">범인 지목</h1>
      <p class="story">${accusation.question}</p>
      <div class="card">
        <p class="task-label">지금까지의 단서</p>
        <ul class="how-to">${CASE.missions
          .filter((m) => progress.done[m.id])
          .map((m) => `<li>${m.solved}</li>`)
          .join("")}</ul>
      </div>
      <div class="suspects" role="group" aria-label="용의자 선택">${people
        .map(([name, role]) => `<button type="button" class="suspect" data-name="${escapeHTML(name)}" aria-pressed="false">
            <strong>${escapeHTML(name)}</strong><span>${escapeHTML(role)}</span></button>`)
        .join("")}</div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>`;

    if (progress.caseSolved) showEnding();

    main.querySelectorAll(".suspect").forEach((btn) =>
      btn.addEventListener("click", () => {
        main.querySelectorAll(".suspect").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        accuse(btn.dataset.name);
      })
    );
  }

  function accuse(name) {
    const { accusation } = CASE;
    if (name === accusation.answer) {
      progress.caseSolved = true;
      saveProgress();
      renderNav();
      renderProgress();
      showEnding();
    } else {
      const why = accusation.wrong[name] || accusation.wrongDefault;
      $("#feedback").innerHTML = note("try", "다시", `<b>${escapeHTML(name)}</b>은(는) 범인이 아닌 것 같아요. ${why}`);
    }
  }

  function showEnding() {
    const { accusation } = CASE;
    $("#feedback").innerHTML = `
      <div class="solved">
        <p class="stamp">사건 해결</p>
        <p>${accusation.ending}</p>
        <p>${accusation.epilogue}</p>
      </div>`;
  }

  // ── 이벤트 ─────────────────────────────

  $("#mission-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (btn && !btn.disabled) go(btn.dataset.view);
  });

  $("#schema-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-insert]");
    const editor = $("#editor");
    if (!btn || !editor) return;
    const text = btn.dataset.insert;
    const { selectionStart: s, selectionEnd: end, value } = editor;
    const before = value.slice(0, s);
    const pad = before && !/[\s(,.]$/.test(before) ? " " : "";
    editor.value = before + pad + text + value.slice(end);
    const caret = s + pad.length + text.length;
    editor.focus();
    editor.setSelectionRange(caret, caret);
    editor.dispatchEvent(new Event("input"));
  });

  $("#reset-btn").addEventListener("click", () => {
    if (!confirm("진행 상황을 모두 지우고 처음부터 시작할까요?")) return;
    progress = { done: {}, queries: {}, hints: {}, seenIntro: false, caseSolved: false };
    saveProgress();
    go("intro");
  });

  // ── 시작 ─────────────────────────────

  async function init() {
    $("#case-title").textContent = CASE.title;
    renderSchema(CASE.tables);
    try {
      const SQL = await initSqlJs({ locateFile: (file) => `vendor/${file}` });
      db = new SQL.Database();
      db.run(CASE.schemaSQL);
      for (const m of CASE.missions) expected[m.id] = normalize(db.exec(m.expected));
      practiceDb = new SQL.Database();
      practiceDb.run(PRACTICE.buildSQL());
      for (const p of PRACTICE.problems) expected[p.id] = normalize(practiceDb.exec(p.expected));
    } catch (err) {
      main.innerHTML = `<h1 tabindex="-1">불러오기 실패</h1>
        <div class="note note-error"><span class="note-icon">오류</span>
        <p>데이터베이스를 불러오지 못했습니다. 웹 주소(http/https)로 열었는지 확인하세요. 파일을 더블클릭해서 열면 동작하지 않습니다.<br><small>${escapeHTML(err.message)}</small></p></div>`;
      return;
    }
    if (!isUnlocked(view)) view = firstOpenMission();
    go(view, { focus: false });
  }

  init();
})();
