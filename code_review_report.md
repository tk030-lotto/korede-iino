# コードレビュー報告書

**プロジェクト名**: これでいいの？ツール（AI開発チェックアシスタント）
**対象バージョン**: v1.0.0 (main @ f60bb68)
**レビュー方式**: 静的解析 + 自動検証スクリプトによる突合検証
**レビュー日時**: 2026-08-26

---

## 総合判定

**公開可能な水準（合格）**。

アプリケーション本体（index.html / app.js / css/*）の実装品質は高く、XSS対策・ランタイム耐性・モバイル配慮は適切。
一方で、既存の `audit_report.md`（Grade A+）に対して数点の記載不備・ドキュメントと実態の不一致があり、コード自体にも改善余地のある箇所が見つかった。

| 分類 | 件数 |
|---|---|
| 🔴 高（ドキュメント不整合） | 2 |
| 🟡 中（ロジック / リポジトリ衛生 / a11y） | 4 |
| 🟢 低（改善提案） | 10 |

---

## 1. 自動検証で確認できた良好な点

| 検証項目 | 結果 |
|---|---|
| `node --check app.js` 構文チェック | エラー 0件 |
| DOM ID 突合（JS参照 43件 ↔ HTML定義） | **100% 一致**、重複 ID なし |
| プロトコル第17条（全ファイル300行以内） | 全ファイル適合（最大 app.js 286行） |
| XSS 対策 | `escapeHtml` が category / title / desc / issueDetail の全注入点に適用、属性値も引用符エスケープ済み。`item.id` は内部生成値のため安全 |
| ランタイム堅牢性 | toast の `clearTimeout`、Enter送信 `preventDefault`、Escape解除、クリップボード `execCommand` フォールバック、iOSズーム防止（font-size 1rem / 16px）すべて実装確認済み |
| CSS 設計 | デザイントークン分離（tokens.css）、単一責任分割、レスポンシブ対応（640px ブレークポイント） |

---

## 2. 発見事項

### 🔴 重要度：高（ドキュメントと実態の不整合）

#### 2-1. README.md が存在しないワークフローを参照している

- **該当箇所**: README.md L167
  > 本リポジトリは GitHub Actions (`.github/workflows/deploy.yml`) による自動デプロイに対応しています。
- **実態**: `.github/workflows/` ディレクトリが存在しない（`Test-Path` → False。`.github/` 配下は `copilot-instructions.md` のみ）
- **影響**: main へ push しても自動デプロイは発生しない。閲覧者が「push すれば反映される」と誤解する恐れ
- **対処案**: deploy.yml を実際に作成するか、README 該当セクションを削除・修正

#### 2-2. audit_report.md の「Zero-Network（完全ローカル動作）」記載が不正確

- **該当箇所**: index.html L12-14（Google Fonts を外部読み込み：preconnect + stylesheet）、audit_report.md L68
- **問題**: 監査レポートの「外部サーバーへの通信を一切行わない」はエビデンスと矛盾。プライバシー重視の層向けツールであるため、フォント読み込み時の IP アドレスの Google 送信は明記すべき事項
- **機能影響**: オフライン時はフォールバックスタックで表示が崩れないため、機能的な問題はなし
- **対処案**: フォントを自己ホスト化するか、監査レポートの文言を修正

### 🟡 重要度：中

#### 2-3. 無回答のままでも「ALL CLEARED」になる

- **該当箇所**: app.js L224-226

```js
const issues = state.checklist.filter(it => it.status === 'issue');
const unknowns = state.checklist.filter(it => it.status === 'unknown');
const isSuccess = issues.length === 0 && unknowns.length === 0;
```

- **問題**: 全項目を未選択（`none`）のまま STEP 4 に進むと「これでいい！確認完了です 🎉」が表示される。仕様書の根幹（*実際に使って確認する*）と矛盾するロジック
- **対処案**:
  - 成功条件に `state.checklist.some(it => it.status === 'checked')` を追加、または
  - 未判定項目が残っている場合に注意喚起メッセージを表示

#### 2-4. style.css がデッドファイル

- **該当箇所**: style.css（@import エントリポイント、8行）
- **実態**: index.html は `css/*.css` 4ファイルを直接リンクしており、style.css はどこからも参照されていない（全ファイル検索の結果、audit_report.md の言及のみ）
- **対処案**: 削除を推奨。今後利用する場合も `@import` は CSS の直列読込を強制しパフォーマンス上の不利があるため非推奨

#### 2-5. デモGIFの二重管理と .gitignore との不整合

- **実態**:
  - `korede_iino_demo.gif`（ルート直下）と `assets/korede_iino_demo.gif` が**両方 git 追跡済み**（各約1.2MB ≒ 合計約2.4MBのリポジトリ肥大）
  - README が埋め込むのは assets 版のみ。ルート版は未使用
  - `.gitignore` は `*.gif` を除外するが、追跡済みファイルには無効。一度削除すると再追加時に**黙って除外される罠**になる
- **対処案**: ルート版 GIF を削除 + .gitignore に意図的な例外 `!assets/korede_iino_demo.gif` を明記

#### 2-6. アクセシビリティ：カスタム項目追加トグルがキーボード操作不可

- **該当箇所**: index.html L168

```html
<div class="add-item-toggle" id="toggle-add-custom">+ AIから提案された項目や独自の確認項目を追加する</div>
```

- **問題**: ボタン役の要素が `<div>` のままで、`role="button"` / `tabindex="0"` / Enter・Space ハンドラがない。キーボードユーザーがカスタム項目追加フォームを開けない
- **対処案**: `<button type="button">` への変更が最も簡単（CSS 変更も最小限で済む）

### 🟢 重要度：低（改善提案）

#### 2-7. トーストに aria-live がない

- index.html L250。スクリーンリーダーにコピー完了等の通知が届かない
- 対処案: `role="status"` および `aria-live="polite"` を付与

#### 2-8. チェック3状態ボタンに aria-pressed がない

- app.js L145-147 で生成される `.check-btn`。選択状態が支援技術に伝わらない
- 対処案: `active` クラス付替えに合わせて `aria-pressed` を設定

#### 2-9. favicon 未定義・テーマ系メタ未指定

- `/favicon.ico` へのリクエストが 404 になるノイズ
- ダークUIのため `theme-color` / `color-scheme: dark` メタ未指定（白フラッシュ・フォームコントロール配色の観点で有効）

#### 2-10. og:image / og:url 未定義

- SNS 共有時の表示が不完全（og:title / og:description / og:type / twitter:card は設定済み）

#### 2-11. カスタム項目 ID の衝突リスク

- app.js L212: `'custom-' + Date.now()` は同一ミリ秒内の連続追加で理論上衝突し得る
- 対処案: `Date.now() + '-' + 連番` 等の一意化

#### 2-12. ダウンロードファイル名にユーザー入力を生使用

- app.js L123, L266: `AI修正依頼_${state.product}.txt`。`\/:*?"<>|` 等の OS 禁止文字を含む入力で保存が失敗する可能性
- 主要ブラウザはダウンロード名を自動サニタイズするため実害は限定的だが、明示的なサニタイズ推奨

#### 2-13. renderChecklist() 全再描画によるフォーカス喪失

- チェックボタンやクイック入力タグ押下のたびにリスト全体を再構築し、インライン入力のフォーカスが失われる。イベントリスナーも再バインドされる
- 現規模（6〜20項目程度）では許容範囲。イベント委譲化（コンテナ1か所での委譲）で改善可能

#### 2-14. フッターのインライン style

- index.html L247: `style="margin-top: 10px;"` → class 化を推奨（デザイントークン管理の統一）

#### 2-15. RECORD.md に制御文字混入

- RECORD.md L35: `\u0007ssets/korede_iino_demo.gif`（"a" が BEL 制御文字 `\x07` になっているタイポ）

#### 2-16. ルールファイルが参照する knowledge/protocol.md が存在しない

- `.clinerules` / `.clauderules` / `.cursorrules` / `.github/copilot-instructions.md` が `knowledge/protocol.md` の読み込みを指示するが、本プロジェクトに当該ファイル・`knowledge/` フォルダが存在しない

---

## 3. 優先対処ランキング

| 優先度 | 項目 | 概要 |
|---|---|---|
| 1 | 2-1 | README の deploy.yml 記載の是正（実装 or 記載削除） |
| 2 | 2-3 | 「無回答で ALL CLEARED」ロジックの修正 |
| 3 | 2-2 | 監査レポートの Zero-Network 記載修正 or フォント自己ホスト化 |
| 4 | 2-5 | 重複 GIF 削除と gitignore 例外の明記 |
| 5 | 2-6 | 追加トグルの button 化（a11y） |

---

## 4. まとめ

静的解析および突合検証の結果、アプリケーション本体はゼロ依存・堅牢な実装であり、公開水準を満たす。
残る課題は主に**ドキュメントと実態の同期**（README / 監査レポート / RECORD.md）と**仕様趣旨に沿った判定ロジックの微修正**であり、いずれも小規模な改修で解消可能。
