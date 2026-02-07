// ==UserScript==
// @name         TryHackMe - Logseq flashcard exporter
// @namespace    https://github.com/liblzma/TryHackMe-Logseq-Flashcard-Exporter
// @match        https://tryhackme.com/room/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @version      1.0
// @author       liblzma
// @description  Export TryHackMe questions as Logseq flashcards.
// ==/UserScript==

(() => {
  /* --------------------------------------------------------------
   * Tiny helpers – keep the script short and readable
   * -------------------------------------------------------------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const uid = (() => {
    let i = 0;
    return () => `qc-${++i}`;
  })();
  const stripHTML = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
  };
  const escMD = (s) => String(s).replace(/\*/g, '\\*');

  /**
   * Extract the room slug from the current URL.
   * @returns {string|null} The room code (e.g. "introtok8s") or null if not on a room page.
   */
  const getRoomCode = () => {
    const m = location.pathname.match(/^\/room\/([^\/?#]+)/);
    return m ? m[1] : null;
  };

  /**
   * Fetch the JSON payload that describes a room’s tasks and questions.
   * @param {string} roomCode - The slug obtained from the URL.
   * @returns {Promise<Object>} Parsed JSON response.
   * @throws {Error} If the request fails (non‑2xx status).
   */
  const fetchRoomData = async (roomCode) => {
    const url = `https://tryhackme.com/api/v2/rooms/tasks?roomCode=${roomCode}`;
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error(`Failed to fetch room data (status ${resp.status})`);
    return await resp.json();
  };

  /**
   * Build and display the modal UI that lets the user pick questions.
   * @param {Object} raw - The raw JSON returned by `fetchRoomData`.
   */
  const buildUI = (raw) => {
    if (!raw?.data?.length) {
      console.info('[QC] No data → stop');
      return;
    }

    // Normalise the data shape: { taskId: { title, taskNo, questions[] } }
    const tasks = {};
    raw.data.forEach((t) => {
      const taskId = uid();
      tasks[taskId] = {
        title: t.title ?? 'Untitled',
        taskNo: t.taskNo ?? '?',
        questions: (t.questions || []).map((q) => ({
          uid: uid(),
          text: stripHTML(q.question ?? ''),
          noAnswer: !!q.progress?.noAnswer,
          hasAnswer: !!q.progress?.submission?.trim(),
          answer: q.progress?.submission?.trim() ?? '',
          answerDesc: q.progress?.answerDescription?.trim() ?? '',
          taskTitle: t.title ?? '',
          taskNo: t.taskNo ?? '?',
        })),
      };
    });

    // -----------------------------------------------------------------
    // Insert minimal CSS for the modal
    // -----------------------------------------------------------------
    GM_addStyle(`
      #qc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999}
      #qc-modal{background:#fff;width:94%;max-width:760px;max-height:94vh;display:flex;flex-direction:column;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.25);font-family:system-ui,sans-serif}
      #qc-header{padding:.8rem 1rem;background:#3b82f6;color:#fff;font-size:1.2rem}
      #qc-body{padding:.8rem 1rem;overflow:auto;flex:1}
      #qc-controls{margin-bottom:.6rem}
      #qc-footer{padding:.5rem 1rem;background:#f9fafb;text-align:right}
      .qc-btn{margin-left:.5rem;padding:.3rem .8rem;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:1.4rem}
      .qc-btn.primary{background:#3b82f6;color:#fff;border-color:#2563eb}
      .qc-task-header{margin-top:1rem;padding:.4rem 0;font-weight:600;border-bottom:1px solid #e5e7eb;font-size:1.4rem}
      .qc-q-item{display:flex;align-items:center;padding:.4rem 0;border-bottom:1px solid #f3f4f6;cursor:pointer}
      .qc-q-item:hover{background:#f0f9ff}
      .qc-q-item input{margin:.2rem .8rem 0 0}
      .qc-answer{margin-top:.2rem;padding-left:1.2rem;color:#555;font-size:1.6rem;}
      .qc-warning{margin-top:.2rem;color:#c00;font-weight:600}
      .qc-no-answer{opacity:.45;pointer-events:none}
      #qc-output{width:100%;height:12rem;font-family:monospace;font-size:.95rem;resize:vertical;margin-top:.6rem}
    `);

    // -----------------------------------------------------------------
    // Modal structure (HTML string for quick insertion)
    // -----------------------------------------------------------------
    const modalHTML = `
      <div id="qc-backdrop">
        <div id="qc-modal">
          <div id="qc-header">Select questions to export</div>
          <div id="qc-body">
            <div id="qc-controls">
              <button class="qc-btn primary" id="qc-select-all">Select all answered questions</button>
              <button class="qc-btn primary" id="qc-deselect-all">Deselect all questions</button>
            </div>
            <div id="qc-tasks"></div>
          </div>
          <div id="qc-footer">
            <button class="qc-btn primary" id="qc-create">Create flash‑cards</button>
            <button class="qc-btn" id="qc-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = $('#qc-backdrop');
    const tasksDiv = $('#qc-tasks');

    // -----------------------------------------------------------------
    // Render the list of tasks / questions inside the modal
    // -----------------------------------------------------------------
    const render = () => {
      tasksDiv.innerHTML = '';
      Object.values(tasks).forEach((t) => {
        const sec = document.createElement('div');

        const hdr = document.createElement('div');
        hdr.className = 'qc-task-header';
        hdr.textContent = `#${t.taskNo} – ${t.title}`;
        sec.appendChild(hdr);

        t.questions.forEach((q) => {
          const item = document.createElement('div');
          item.className = 'qc-q-item';
          if (q.noAnswer) item.classList.add('qc-no-answer');

          // Store data for later look‑ups
          item.dataset.uid = q.uid;
          item.dataset.noAnswer = q.noAnswer;
          item.dataset.hasAnswer = q.hasAnswer;

          // Checkbox (disabled when the question is marked as “no answer”)
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = q.hasAnswer;
          if (q.noAnswer) cb.disabled = true;
          cb.dataset.uid = q.uid;
          item.appendChild(cb);

          // Text container (question, optional warning, optional answer)
          const txt = document.createElement('div');
          const p = document.createElement('p');
          p.textContent = q.text;
          txt.appendChild(p);

          if (!q.noAnswer && !q.hasAnswer) {
            const warn = document.createElement('div');
            warn.className = 'qc-warning';
            warn.textContent = '⚠️ Not answered yet';
            txt.appendChild(warn);
          }

          if (q.hasAnswer) {
            const ans = document.createElement('div');
            ans.className = 'qc-answer';
            ans.textContent = `${q.answer}`;
            txt.appendChild(ans);
          }

          item.appendChild(txt);

          // Row click toggles the checkbox (except when clicking the checkbox itself)
          item.addEventListener('click', (e) => {
            if (e.target !== cb && !q.noAnswer) cb.checked = !cb.checked;
          });

          sec.appendChild(item);
        });

        tasksDiv.appendChild(sec);
      });
    };

    render();

    // -----------------------------------------------------------------
    // Top‑control buttons (Select / Deselect)
    // -----------------------------------------------------------------
    $('#qc-select-all').onclick = () => {
      $$('input[type="checkbox"]:not(:disabled)').forEach((cb) => {
        if (cb.parentElement.dataset.hasAnswer === 'true') cb.checked = true;
      });
    };

    $('#qc-deselect-all').onclick = () => {
      $$('input[type="checkbox"]:not(:disabled)').forEach((cb) => (cb.checked = false));
    };

    // -----------------------------------------------------------------
    // Footer actions (Cancel / Escape)
    // -----------------------------------------------------------------
    $('#qc-cancel').onclick = () => modal.remove();
    document.addEventListener('keydown', (e) => e.key === 'Escape' && modal.remove());

    // -----------------------------------------------------------------
    // Create flash‑cards: build markdown, show textarea + copy button
    // -----------------------------------------------------------------
    $('#qc-create').onclick = () => {
      const selectedUids = $$('input:checked').map((cb) => cb.parentElement.dataset.uid);
      const selected = [];

      Object.values(tasks).forEach((t) =>
        t.questions.forEach((q) => {
          if (selectedUids.includes(q.uid)) selected.push(q);
        })
      );

      if (!selected.length) return alert('Select at least one question');

      const lines = [];

      selected.forEach((q) => {
        // Task heading
        lines.push(`- ### ${q.taskTitle}`);

        // Question line – the `#card` identifies the log as a flashcard
        lines.push(`  ${q.text.trim()} #card`);

        // Optional “Answer format” line (kept if already present)
        let fmt = q.answerDesc.trim();
        if (fmt && !/^Answer\s*format\s*:/i.test(fmt)) fmt = `Answer format: ${fmt}`;
        if (fmt) lines.push(`  ${escMD(fmt)}`);

        // Answer line – placeholder if missing
        const ans = q.hasAnswer ? q.answer : '<answer‑missing>';
        lines.push(`\t- **${ans}**`);
        lines.push(''); // blank line separates cards
      });

      const md = lines.join('\n');

      // Replace body with result view
      $('#qc-body').innerHTML = `
        <p>Copy the markdown below into Logseq (or any markdown‑compatible editor).</p>
        <textarea id="qc-output" readonly>${md}</textarea>
        <div style="margin-top:.6rem;text-align:right;">
          <button class="qc-btn primary" id="qc-copy">Copy</button>
          <button class="qc-btn" id="qc-close">Close</button>
        </div>`;

      // Copy button – uses GM_setClipboard and provides a short visual feedback
      $('#qc-copy').onclick = function () {
        GM_setClipboard(md);
        const btn = this;
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
        }, 2000);
      };

      $('#qc-close').onclick = () => modal.remove();
      $('#qc-footer').remove(); // Footer (Create/Cancel) no longer needed
    };
  };

  /**
   * Entry point that is run via the menu command.
   * It validates the page, fetches the room JSON and launches the UI.
   */
  const startExport = async () => {
    const roomCode = getRoomCode();
    if (!roomCode) {
      alert('⚠️ This page does not look like a TryHackMe room (no /room/<slug> in the URL).');
      return;
    }

    try {
      const json = await fetchRoomData(roomCode);
      buildUI(json);
    } catch (e) {
      console.error(e);
      alert(`❌ Could not load room data: ${e.message}`);
    }
  };

  // Register the menu entry
  GM_registerMenuCommand('Export as flashcards', startExport);
})();
