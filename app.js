/**
 * これでいいの？ - AI開発チェックアシスタント (app.js)
 * Zero-Dependency Pure Vanilla JavaScript
 */
(function () {
  'use strict';

  const defaultItems = [
    { id: 'chk-purpose', category: '目的', title: '当初の目的を達成しているか', desc: 'やりたかった本来の目的が実際に実現できていますか？', status: 'none', issueDetail: '' },
    { id: 'chk-feature', category: '機能', title: '必要な機能があり、余計な機能がないか', desc: '欲しかった機能が揃っているか、不要な機能がないか確認します。', status: 'none', issueDetail: '' },
    { id: 'chk-input', category: '入力', title: '想定したデータ・操作を受け付けられるか', desc: '通常のデータだけでなく、空欄や特殊な形式でも破綻しませんか？', status: 'none', issueDetail: '' },
    { id: 'chk-output', category: '出力', title: '期待通りの結果が分かりやすく得られるか', desc: '計算や変換結果が正しいか、表示崩れがないか確認します。', status: 'none', issueDetail: '' },
    { id: 'chk-operation', category: '操作', title: '迷わずスムーズに操作できるか', desc: 'ボタン配置や画面の流れが直感的で、ストレスなく動かせますか？', status: 'none', issueDetail: '' },
    { id: 'chk-error', category: 'エラー', title: '失敗・エラー時に分かりやすい案内が出るか', desc: '間違った操作をした時に、画面が固まらず原因が分かりますか？', status: 'none', issueDetail: '' }
  ];

  const state = { currentStep: 0, product: '', purpose: '', checklist: JSON.parse(JSON.stringify(defaultItems)) };
  const screens = {
    hero: document.getElementById('screen-hero'),
    input: document.getElementById('screen-input'),
    prompt: document.getElementById('screen-prompt'),
    checklist: document.getElementById('screen-checklist'),
    result: document.getElementById('screen-result')
  };

  const progressContainer = document.getElementById('progress-container');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const inputProduct = document.getElementById('input-product');
  const inputPurpose = document.getElementById('input-purpose');
  const step1NextBtn = document.getElementById('step1-next-btn');
  const aiCheckPrompt = document.getElementById('ai-check-prompt');
  const aiFixPrompt = document.getElementById('ai-fix-prompt');
  const checklistContainer = document.getElementById('checklist-items');
  const checkedCountEl = document.getElementById('checked-count');
  const totalCountEl = document.getElementById('total-count');
  const meterPercent = document.getElementById('meter-percent');
  const meterFill = document.getElementById('meter-fill');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  function showToast(msg) {
    if (toastText) toastText.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2200);
  }

  function copyText(text, msg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(msg);
    });
  }

  function switchScreen(step) {
    state.currentStep = step;
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (step === 0) screens.hero.classList.add('active');
    if (step === 1) { screens.input.classList.add('active'); validateStep1(); }
    if (step === 2) { generateCheckPrompt(); screens.prompt.classList.add('active'); }
    if (step === 3) { renderChecklist(); screens.checklist.classList.add('active'); }
    if (step === 4) { renderResultScreen(); screens.result.classList.add('active'); }

    progressContainer.classList.toggle('visible', step > 0);
    stepIndicators.forEach(ind => {
      const num = parseInt(ind.getAttribute('data-step'), 10);
      ind.classList.remove('active', 'completed');
      if (num === step - 1) ind.classList.add('active');
      else if (num < step - 1) ind.classList.add('completed');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep1() {
    step1NextBtn.disabled = !(inputProduct.value.trim() && inputPurpose.value.trim());
  }
  inputProduct.addEventListener('input', validateStep1);
  inputPurpose.addEventListener('input', validateStep1);

  document.querySelectorAll('.preset-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.getAttribute('data-target'));
      if (el) { el.value = btn.getAttribute('data-value'); el.dispatchEvent(new Event('input')); el.focus(); }
    });
  });

  step1NextBtn.addEventListener('click', () => {
    state.product = inputProduct.value.trim();
    state.purpose = inputPurpose.value.trim();
    switchScreen(2);
  });

  function generateCheckPrompt() {
    aiCheckPrompt.value = `以下のソフトウェア（作成物）をAIに作ってもらいました。
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

実際に操作しながら1つずつチェックできるよう、分かりやすい箇条書きで具体的に教えてください。`;
  }

  document.getElementById('copy-prompt-btn').addEventListener('click', () => copyText(aiCheckPrompt.value, 'AIへの質問文をコピーしました！'));
  document.getElementById('reset-prompt-btn').addEventListener('click', () => { generateCheckPrompt(); showToast('初期文に戻しました'); });
  document.getElementById('step2-back-btn').addEventListener('click', () => switchScreen(1));
  document.getElementById('step2-next-btn').addEventListener('click', () => switchScreen(3));

  function renderChecklist() {
    checklistContainer.innerHTML = '';
    let completedCount = 0;

    state.checklist.forEach(item => {
      if (item.status !== 'none') completedCount++;
      const card = document.createElement('div');
      card.className = `checklist-card status-${item.status}`;
      const isCustom = item.id.startsWith('custom-');

      card.innerHTML = `
        <div class="checklist-card-top">
          <div>
            <div class="checklist-meta"><span class="category-tag">${escapeHtml(item.category)}</span></div>
            <div class="checklist-item-title">${escapeHtml(item.title)}</div>
            <div class="checklist-item-desc">${escapeHtml(item.desc)}</div>
          </div>
          ${isCustom ? `<button class="btn-item-delete" data-del="${item.id}" title="削除">✕</button>` : ''}
        </div>
        <div class="checklist-actions">
          <button type="button" class="check-btn btn-check-success ${item.status === 'checked' ? 'active' : ''}" data-id="${item.id}" data-st="checked">✓ 確認済み</button>
          <button type="button" class="check-btn btn-check-danger ${item.status === 'issue' ? 'active' : ''}" data-id="${item.id}" data-st="issue">⚠️ 問題あり</button>
          <button type="button" class="check-btn btn-check-warning ${item.status === 'unknown' ? 'active' : ''}" data-id="${item.id}" data-st="unknown">❓ 分からない</button>
        </div>
        ${(item.status === 'issue' || item.status === 'unknown') ? `
          <div class="checklist-inline-issue">
            <label class="inline-input-label">${item.status === 'issue' ? '⚠️ 具体的な問題や症状を入力:' : '❓ 分からない点・確認したいこと:'}</label>
            <input type="text" class="form-control inline-issue-input" data-id="${item.id}" placeholder="${item.status === 'issue' ? '例: ファイル名に日本語が入るとエラーになる' : '例: このボタンを押したときの正常動作を知りたい'}" value="${escapeHtml(item.issueDetail || '')}">
            ${item.status === 'issue' ? `
              <div class="input-presets" style="margin-top: 6px;">
                <span class="preset-title">入力例:</span>
                <button type="button" class="preset-tag inline-tag" data-id="${item.id}" data-val="ファイル名に日本語が入ると失敗する">日本語で失敗する</button>
                <button type="button" class="preset-tag inline-tag" data-id="${item.id}" data-val="この機能はいらない">この機能はいらない</button>
                <button type="button" class="preset-tag inline-tag" data-id="${item.id}" data-val="想定した結果と違う">想定した結果と違う</button>
              </div>` : ''}
          </div>` : ''}
      `;
      checklistContainer.appendChild(card);
    });

    const total = state.checklist.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    checkedCountEl.textContent = completedCount;
    totalCountEl.textContent = total;
    meterPercent.textContent = `${pct}%`;
    meterFill.style.width = `${pct}%`;

    document.querySelectorAll('.check-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.checklist.find(it => it.id === btn.getAttribute('data-id'));
        const st = btn.getAttribute('data-st');
        if (item) { item.status = item.status === st ? 'none' : st; renderChecklist(); }
      });
    });

    document.querySelectorAll('.inline-issue-input').forEach(inp => {
      inp.addEventListener('input', e => {
        const item = state.checklist.find(it => it.id === inp.getAttribute('data-id'));
        if (item) item.issueDetail = e.target.value;
      });
    });

    document.querySelectorAll('.inline-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const item = state.checklist.find(it => it.id === tag.getAttribute('data-id'));
        if (item) { item.issueDetail = tag.getAttribute('data-val'); renderChecklist(); }
      });
    });

    document.querySelectorAll('.btn-item-delete').forEach(delBtn => {
      delBtn.addEventListener('click', () => {
        state.checklist = state.checklist.filter(it => it.id !== delBtn.getAttribute('data-del'));
        renderChecklist();
        showToast('項目を削除しました');
      });
    });
  }

  const customForm = document.getElementById('custom-item-form');
  const customTitle = document.getElementById('custom-item-title');
  document.getElementById('toggle-add-custom').addEventListener('click', () => {
    customForm.classList.toggle('hidden');
    if (!customForm.classList.contains('hidden')) customTitle.focus();
  });

  document.getElementById('add-custom-btn').addEventListener('click', () => {
    const val = customTitle.value.trim();
    if (!val) return;
    state.checklist.push({ id: 'custom-' + Date.now(), category: 'カスタム', title: val, desc: '個別に追加された動作確認項目です。', status: 'none', issueDetail: '' });
    customTitle.value = '';
    customForm.classList.add('hidden');
    renderChecklist();
    showToast('確認項目を追加しました');
  });

  document.getElementById('step3-back-btn').addEventListener('click', () => switchScreen(2));
  document.getElementById('step3-next-btn').addEventListener('click', () => switchScreen(4));

  function renderResultScreen() {
    const issues = state.checklist.filter(it => it.status === 'issue');
    const unknowns = state.checklist.filter(it => it.status === 'unknown');
    const isSuccess = issues.length === 0 && unknowns.length === 0;

    document.getElementById('result-success-container').classList.toggle('hidden', !isSuccess);
    document.getElementById('result-issues-container').classList.toggle('hidden', isSuccess);
    if (!isSuccess) updateFixPrompt();
  }

  function updateFixPrompt() {
    const issues = state.checklist.filter(it => it.status === 'issue');
    const unknowns = state.checklist.filter(it => it.status === 'unknown');
    let text = '';

    if (issues.length > 0) {
      text += '【問題があった項目】\n';
      issues.forEach((it, i) => {
        const d = it.issueDetail.trim() ? ` -> 症状: ${it.issueDetail.trim()}` : '';
        text += `${i + 1}. [${it.category}] ${it.title}${d}\n`;
      });
      text += '\n';
    }
    if (unknowns.length > 0) {
      text += '【確認したい・分からない項目】\n';
      unknowns.forEach((it, i) => {
        const d = it.issueDetail.trim() ? ` -> 疑問点: ${it.issueDetail.trim()}` : '';
        text += `${i + 1}. [${it.category}] ${it.title}${d}\n`;
      });
      text += '\n';
    }

    aiFixPrompt.value = `作成してもらった以下のソフトウェアを実際に動かして確認したところ、修正または確認したい点が見つかりました。
内容を確認し、修正方法または正常な動作仕様について教えてください。

【ソフトウェア】
${state.product}

【本来の目的】
${state.purpose}

${text.trim()}

修正が必要な場合は、該当箇所のコード修正案と変更理由を分かりやすく教えてください。`;
  }

  document.getElementById('copy-fix-prompt-btn').addEventListener('click', () => copyText(aiFixPrompt.value, 'AIへの修正依頼文をコピーしました！'));
  document.getElementById('reset-fix-prompt-btn').addEventListener('click', () => { updateFixPrompt(); showToast('初期文に戻しました'); });
  document.getElementById('step4-back-btn').addEventListener('click', () => switchScreen(3));
  document.getElementById('step4-restart-btn').addEventListener('click', resetApp);
  document.getElementById('finish-btn').addEventListener('click', resetApp);
  document.getElementById('hero-start-btn').addEventListener('click', () => switchScreen(1));

  function resetApp() {
    state.product = ''; state.purpose = '';
    inputProduct.value = ''; inputPurpose.value = '';
    state.checklist = JSON.parse(JSON.stringify(defaultItems));
    switchScreen(0);
    showToast('初期状態にリセットしました');
  }

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('最初からやり直しますか？ 入力内容はクリアされます。')) resetApp();
  });

  function escapeHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  switchScreen(0);
})();
