/**
 * これでいいの？ - AI開発チェックアシスタント
 * Pure Vanilla JavaScript Application Logic
 */

(function () {
  'use strict';

  // ==========================================================================
  // Application State
  // ==========================================================================
  const state = {
    currentStep: 0, // 0: Hero, 1: Input, 2: Prompt, 3: Checklist, 4: Result
    product: '',
    purpose: '',
    checklist: [
      {
        id: 'chk-purpose',
        category: '目的',
        title: '当初の目的を達成しているか',
        desc: '最初にやりたかった本来の目的が、実際にこのツールで実現できていますか？',
        status: 'none', // 'none' | 'checked' | 'issue' | 'unknown'
        issueDetail: ''
      },
      {
        id: 'chk-feature',
        category: '機能',
        title: '必要な機能があり、余計な機能がないか',
        desc: '欲しかった機能が揃っているか、逆にAIが勝手に追加した不要な機能がないか確認します。',
        status: 'none',
        issueDetail: ''
      },
      {
        id: 'chk-input',
        category: '入力',
        title: '想定したデータ・操作を受け付けられるか',
        desc: '普通のデータだけでなく、空欄や少し変わった形式を入力しても破綻しませんか？',
        status: 'none',
        issueDetail: ''
      },
      {
        id: 'chk-output',
        category: '出力',
        title: '期待通りの結果が分かりやすく得られるか',
        desc: '処理結果や出力内容が正しいか、文字化けや表示崩れがないか確認します。',
        status: 'none',
        issueDetail: ''
      },
      {
        id: 'chk-operation',
        category: '操作',
        title: '迷わずスムーズに操作できるか',
        desc: 'ボタンの配置や画面の流れが直感的で、ストレスなく動かせるか確認します。',
        status: 'none',
        issueDetail: ''
      },
      {
        id: 'chk-error',
        category: 'エラー',
        title: '失敗・エラー時に分かりやすい案内が出るか',
        desc: '意図しない操作をしたときに、画面が固まったりせず原因が分かりますか？',
        status: 'none',
        issueDetail: ''
      }
    ]
  };

  // ==========================================================================
  // DOM Element References
  // ==========================================================================
  const screens = {
    hero: document.getElementById('screen-hero'),
    input: document.getElementById('screen-input'),
    prompt: document.getElementById('screen-prompt'),
    checklist: document.getElementById('screen-checklist'),
    result: document.getElementById('screen-result')
  };

  const progressContainer = document.getElementById('progress-container');
  const stepIndicators = document.querySelectorAll('.step-indicator');

  // Input screen elements
  const inputProduct = document.getElementById('input-product');
  const inputPurpose = document.getElementById('input-purpose');
  const step1NextBtn = document.getElementById('step1-next-btn');

  // Prompt screen elements
  const aiCheckPrompt = document.getElementById('ai-check-prompt');
  const copyPromptBtn = document.getElementById('copy-prompt-btn');
  const step2BackBtn = document.getElementById('step2-back-btn');
  const step2NextBtn = document.getElementById('step2-next-btn');

  // Checklist screen elements
  const checklistContainer = document.getElementById('checklist-items');
  const checkedCountEl = document.getElementById('checked-count');
  const totalCountEl = document.getElementById('total-count');
  const step3BackBtn = document.getElementById('step3-back-btn');
  const step3NextBtn = document.getElementById('step3-next-btn');
  const toggleAddCustom = document.getElementById('toggle-add-custom');
  const customItemForm = document.getElementById('custom-item-form');
  const customItemTitle = document.getElementById('custom-item-title');
  const addCustomBtn = document.getElementById('add-custom-btn');

  // Result screen elements
  const resultSuccessContainer = document.getElementById('result-success-container');
  const resultIssuesContainer = document.getElementById('result-issues-container');
  const issueCountTag = document.getElementById('issue-count-tag');
  const unknownCountTag = document.getElementById('unknown-count-tag');
  const issueInputsContainer = document.getElementById('issue-inputs-container');
  const aiFixPrompt = document.getElementById('ai-fix-prompt');
  const copyFixPromptBtn = document.getElementById('copy-fix-prompt-btn');
  const step4BackBtn = document.getElementById('step4-back-btn');
  const step4RestartBtn = document.getElementById('step4-restart-btn');
  const finishBtn = document.getElementById('finish-btn');

  // Common elements
  const heroStartBtn = document.getElementById('hero-start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  function showToast(message) {
    if (toastText) toastText.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2400);
  }

  function copyToClipboard(text, successMsg = 'クリップボードにコピーしました！') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(successMsg);
    });
  }

  function updateProgressBar() {
    if (state.currentStep === 0) {
      progressContainer.classList.remove('visible');
    } else {
      progressContainer.classList.add('visible');
      stepIndicators.forEach((indicator) => {
        const stepNum = parseInt(indicator.getAttribute('data-step'), 10);
        const currentActive = state.currentStep - 1; // Step 1 is index 0
        indicator.classList.remove('active', 'completed');
        if (stepNum === currentActive) {
          indicator.classList.add('active');
        } else if (stepNum < currentActive) {
          indicator.classList.add('completed');
        }
      });
    }
  }

  function switchScreen(step) {
    state.currentStep = step;
    Object.values(screens).forEach((screen) => screen.classList.remove('active'));

    switch (step) {
      case 0:
        screens.hero.classList.add('active');
        break;
      case 1:
        screens.input.classList.add('active');
        validateStep1Input();
        break;
      case 2:
        generateCheckPrompt();
        screens.prompt.classList.add('active');
        break;
      case 3:
        renderChecklist();
        screens.checklist.classList.add('active');
        break;
      case 4:
        renderResultScreen();
        screens.result.classList.add('active');
        break;
    }

    updateProgressBar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==========================================================================
  // Step 1: Input Handling & Validation
  // ==========================================================================
  function validateStep1Input() {
    const isValid = inputProduct.value.trim() !== '' && inputPurpose.value.trim() !== '';
    step1NextBtn.disabled = !isValid;
  }

  inputProduct.addEventListener('input', validateStep1Input);
  inputPurpose.addEventListener('input', validateStep1Input);

  // Preset Tags
  document.querySelectorAll('.preset-tag').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const val = btn.getAttribute('data-value');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.value = val;
        targetEl.dispatchEvent(new Event('input'));
        targetEl.focus();
      }
    });
  });

  step1NextBtn.addEventListener('click', () => {
    state.product = inputProduct.value.trim();
    state.purpose = inputPurpose.value.trim();
    switchScreen(2);
  });

  // ==========================================================================
  // Step 2: AI Check Prompt Generation
  // ==========================================================================
  function generateCheckPrompt() {
    const promptText = `以下のソフトウェア（作成物）をAIに作ってもらいました。
ソースコードを読むのではなく、「実際に動かして動作確認を行うためのチェック項目リスト」を作成してください。

【作成したもの】
${state.product}

【本来の目的】
${state.purpose}

【作成してほしいチェック項目】
1. 当初の目的がしっかり達成できているかの確認
2. 必要な機能が正しく動くか、不要な機能が勝手に入っていないか
3. 想定した入力や、少し変わった入力（空欄など）に対する動作
4. 期待通りの出力・表示が得られるか
5. 操作手順に不自然な点や使いにくさがないか
6. エラー発生時に分かりやすいメッセージが出るか

実際に操作しながら1つずつチェックできるよう、分かりやすい箇条書きで教えてください。`;

    aiCheckPrompt.value = promptText;
  }

  copyPromptBtn.addEventListener('click', () => {
    copyToClipboard(aiCheckPrompt.value, 'AIへの質問文をコピーしました！');
  });

  step2BackBtn.addEventListener('click', () => switchScreen(1));
  step2NextBtn.addEventListener('click', () => switchScreen(3));

  // ==========================================================================
  // Step 3: Checklist Rendering & Interaction
  // ==========================================================================
  function renderChecklist() {
    checklistContainer.innerHTML = '';
    let checkedCount = 0;

    state.checklist.forEach((item, index) => {
      if (item.status === 'checked') checkedCount++;

      const card = document.createElement('div');
      card.className = `checklist-card status-${item.status}`;
      card.id = `card-${item.id}`;

      card.innerHTML = `
        <div class="checklist-card-top">
          <div>
            <div class="checklist-meta">
              <span class="category-tag">${escapeHtml(item.category)}</span>
            </div>
            <div class="checklist-item-title">${escapeHtml(item.title)}</div>
            <div class="checklist-item-desc">${escapeHtml(item.desc)}</div>
          </div>
        </div>
        <div class="checklist-actions">
          <button type="button" class="check-btn btn-check-success ${item.status === 'checked' ? 'active' : ''}" data-id="${item.id}" data-status="checked">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            確認済み
          </button>
          <button type="button" class="check-btn btn-check-danger ${item.status === 'issue' ? 'active' : ''}" data-id="${item.id}" data-status="issue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            問題あり
          </button>
          <button type="button" class="check-btn btn-check-warning ${item.status === 'unknown' ? 'active' : ''}" data-id="${item.id}" data-status="unknown">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            分からない
          </button>
        </div>
      `;

      checklistContainer.appendChild(card);
    });

    checkedCountEl.textContent = checkedCount;
    totalCountEl.textContent = state.checklist.length;

    // Attach click events
    document.querySelectorAll('.check-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const newStatus = btn.getAttribute('data-status');
        const targetItem = state.checklist.find((it) => it.id === id);

        if (targetItem) {
          // トグル（同じボタンを再度押したら解除）
          targetItem.status = targetItem.status === newStatus ? 'none' : newStatus;
          renderChecklist();
        }
      });
    });
  }

  // Custom Item Form Toggle
  toggleAddCustom.addEventListener('click', () => {
    customItemForm.classList.toggle('hidden');
    if (!customItemForm.classList.contains('hidden')) {
      customItemTitle.focus();
    }
  });

  addCustomBtn.addEventListener('click', () => {
    const title = customItemTitle.value.trim();
    if (!title) return;

    state.checklist.push({
      id: 'custom-' + Date.now(),
      category: 'カスタム',
      title: title,
      desc: '個別に追加された動作確認項目です。',
      status: 'none',
      issueDetail: ''
    });

    customItemTitle.value = '';
    customItemForm.classList.add('hidden');
    renderChecklist();
    showToast('確認項目を追加しました');
  });

  step3BackBtn.addEventListener('click', () => switchScreen(2));
  step3NextBtn.addEventListener('click', () => switchScreen(4));

  // ==========================================================================
  // Step 4: Result Screen & Fix Prompt Generation
  // ==========================================================================
  function renderResultScreen() {
    const issues = state.checklist.filter((item) => item.status === 'issue');
    const unknowns = state.checklist.filter((item) => item.status === 'unknown');

    if (issues.length === 0 && unknowns.length === 0) {
      // 成功画面
      resultSuccessContainer.classList.remove('hidden');
      resultIssuesContainer.classList.add('hidden');
    } else {
      // 問題あり・要確認画面
      resultSuccessContainer.classList.add('hidden');
      resultIssuesContainer.classList.remove('hidden');

      issueCountTag.textContent = `⚠️ 問題あり: ${issues.length}件`;
      unknownCountTag.textContent = `❓ 分からない: ${unknowns.length}件`;

      renderIssueDetailInputs(issues, unknowns);
      updateFixPrompt();
    }
  }

  function renderIssueDetailInputs(issues, unknowns) {
    issueInputsContainer.innerHTML = '';
    const allProblemItems = [...issues, ...unknowns];

    allProblemItems.forEach((item) => {
      const isIssue = item.status === 'issue';
      const container = document.createElement('div');
      container.className = 'issue-detail-item';

      const icon = isIssue ? '⚠️' : '❓';
      const badgeClass = isIssue ? 'red' : 'yellow';
      const placeholder = isIssue
        ? '例: ファイル名に日本語が含まれているとエラーで止まってしまう'
        : '例: このボタンを押したときに何が起きるのが正常なのか確認したい';

      container.innerHTML = `
        <div class="issue-item-header">
          <span>${icon} [${escapeHtml(item.category)}] ${escapeHtml(item.title)}</span>
        </div>
        <input type="text" class="form-control issue-input" data-id="${item.id}"
          placeholder="${placeholder}"
          value="${escapeHtml(item.issueDetail || '')}">
      `;

      issueInputsContainer.appendChild(container);
    });

    // 入力変更でプロンプト即時更新
    document.querySelectorAll('.issue-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const id = input.getAttribute('data-id');
        const target = state.checklist.find((it) => it.id === id);
        if (target) {
          target.issueDetail = input.value;
          updateFixPrompt();
        }
      });
    });
  }

  function updateFixPrompt() {
    const issues = state.checklist.filter((item) => item.status === 'issue');
    const unknowns = state.checklist.filter((item) => item.status === 'unknown');

    let issuesText = '';

    if (issues.length > 0) {
      issuesText += '【問題があった項目】\n';
      issues.forEach((it, idx) => {
        const detail = it.issueDetail.trim() ? ` -> 症状: ${it.issueDetail.trim()}` : '';
        issuesText += `${idx + 1}. [${it.category}] ${it.title}${detail}\n`;
      });
      issuesText += '\n';
    }

    if (unknowns.length > 0) {
      issuesText += '【判断がつかない・確認したい項目】\n';
      unknowns.forEach((it, idx) => {
        const detail = it.issueDetail.trim() ? ` -> 疑問点: ${it.issueDetail.trim()}` : '';
        issuesText += `${idx + 1}. [${it.category}] ${it.title}${detail}\n`;
      });
      issuesText += '\n';
    }

    const promptText = `作成してもらった以下のソフトウェアを実際に動かして確認したところ、修正または確認したい点が見つかりました。
内容を確認し、修正方法または正常な動作仕様について教えてください。

【ソフトウェア】
${state.product}

【本来の目的】
${state.purpose}

${issuesText.trim()}

修正が必要な場合は、該当箇所のコード修正案と変更理由を分かりやすく教えてください。`;

    aiFixPrompt.value = promptText;
  }

  copyFixPromptBtn.addEventListener('click', () => {
    copyToClipboard(aiFixPrompt.value, 'AIへの修正・確認依頼文をコピーしました！');
  });

  step4BackBtn.addEventListener('click', () => switchScreen(3));
  step4RestartBtn.addEventListener('click', () => resetApp());
  finishBtn.addEventListener('click', () => resetApp());

  // ==========================================================================
  // Reset & Navigation
  // ==========================================================================
  function resetApp() {
    state.product = '';
    state.purpose = '';
    inputProduct.value = '';
    inputPurpose.value = '';
    state.checklist.forEach((item) => {
      item.status = 'none';
      item.issueDetail = '';
    });
    // カスタム項目をクリアして初期項目のみに
    state.checklist = state.checklist.filter((item) => !item.id.startsWith('custom-'));
    switchScreen(0);
    showToast('初期状態にリセットしました');
  }

  heroStartBtn.addEventListener('click', () => switchScreen(1));
  resetBtn.addEventListener('click', () => {
    if (confirm('最初からやり直しますか？ 入力内容はクリアされます。')) {
      resetApp();
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 初期起動
  switchScreen(0);
})();
