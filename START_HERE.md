# 実装開始前のチェックリスト

**作成日**: 2025-11-16 23:30
**目的**: 実装を始める前に、計画の整合性を確認する

---

## 🔍 Step 1: Claude API必須化の確認（10分）

このプロジェクトは **Claude API を必須** としています。
以下のファイルで Claude API が必須として扱われているか確認してください。

### 確認すべきファイル

```bash
# 各ファイルで "Claude API" を検索
cd ~/github-activity-aggregator

# 1. SPECIFICATION.md
grep -i "claude" SPECIFICATION.md
# → Claude APIの説明があるか？必須と書かれているか？

# 2. IMPLEMENTATION_PLAN.md
grep -i "claude" IMPLEMENTATION_PLAN.md
# → Step 2で Claude API テストがあるか？
# → Step 0-2で Claude API Key 取得が必須ステップになっているか？

# 3. IMPLEMENTATION_DAY2.md
grep -i "claude" IMPLEMENTATION_DAY2.md
# → src/claude/analyzer.ts が Claude SDK を使っているか？

# 4. IMPLEMENTATION_DAY3.md, DAY4.md, WEEKEND.md
grep -i "claude" IMPLEMENTATION_DAY*.md IMPLEMENTATION_WEEKEND.md
```

### ✅ 期待される結果

- [ ] すべてのファイルで Claude API が言及されている
- [ ] IMPLEMENTATION_PLAN.md の Step 0-2 で Claude API Key 取得手順がある
- [ ] IMPLEMENTATION_PLAN.md の Step 2 で Claude API テストがある
- [ ] src/claude/analyzer.ts で `@anthropic-ai/sdk` を使用している

### ❌ もし問題があれば

以下のファイルを修正する必要があります：

1. **SPECIFICATION.md**
   - Claude API を必須要件として明記

2. **IMPLEMENTATION_PLAN.md**
   - Step 0-2: Claude API Key 取得を必須化
   - Step 2: Claude API テストを必須化

3. **IMPLEMENTATION_DAY2.md**
   - src/claude/analyzer.ts で必ず Claude SDK を使用

---

## 🎯 Step 2: 実装順序の確認（5分）

### 推奨される実装順序

```
1日目（3-4時間）: IMPLEMENTATION_PLAN.md
├─ Step 0: アカウント準備
│  ├─ AWS アカウント
│  ├─ Claude API Key 取得 ⭐必須
│  └─ GitHub Token 取得
├─ Step 1: GitHub API テスト
├─ Step 2: Claude API テスト ⭐必須
├─ Step 3: Supabase テスト
└─ Step 4: Notion テスト

2日目（2-3時間）: IMPLEMENTATION_DAY2.md
├─ src/github/client.ts
├─ src/claude/analyzer.ts ⭐Claude SDK使用
├─ src/supabase/client.ts
├─ src/notion/client.ts
└─ src/index.ts

3日目（2-3時間）: IMPLEMENTATION_DAY3.md
└─ Lambda デプロイ

4日目（1-2時間）: IMPLEMENTATION_DAY4.md
└─ EventBridge 設定
```

### ✅ チェック項目

- [ ] 1日目で Claude API テストが含まれている
- [ ] 2日目で src/claude/analyzer.ts が Claude SDK を使用
- [ ] すべてのステップが明確に記載されている

---

## 📝 Step 3: コスト確認（5分）

### Claude API コスト

```
モデル: claude-3-5-haiku-20241022

料金:
- 入力: $0.80 / 1M tokens
- 出力: $4.00 / 1M tokens

週次レポート想定:
- 入力: 約200 tokens（コミットリスト）
- 出力: 約150 tokens（サマリー）
- 週次コスト: $0.0008（約0.12円）
- 月次コスト: $0.003（約0.45円）
- 年次コスト: $0.04（約6円）

初期チャージ: $5（約750円）
→ 約125年分のクレジット ✅
```

### 総コスト

```
AWS Lambda:     $0/月（無料枠内）
EventBridge:    $0/月（無料枠内）
Supabase Pro:   $0/月（既存契約）
Claude API:     $0.003/月（約0.45円）
GitHub API:     $0/月（無料）

合計: 約0.45円/月 ✅
```

---

## 🚀 Step 4: 実装開始

すべて確認できたら、以下の順序で実装を開始してください：

```bash
# 1. IMPLEMENTATION_PLAN.md を開く
code ~/github-activity-aggregator/IMPLEMENTATION_PLAN.md

# 2. Step 0 から順に実行
# 各ステップのチェックボックスに ✅ を入れながら進める

# 3. エラーが出たら、各ファイルの「エラー対処」セクションを参照
```

---

## ⚠️ 重要な注意事項

### Claude API について

1. **必ず Step 0-2 で Claude API Key を取得**
   - https://console.anthropic.com/
   - $5 チャージが必要
   - API Key は必ず保存（二度と表示されない）

2. **Step 2 で Claude API テストを必ず実行**
   - test-claude.ts を実行
   - エラーが出たら進まない
   - コスト計算が表示されることを確認

3. **環境変数に必ず追加**
   ```bash
   CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
   ```

### もし Claude API なしで実装したい場合

**推奨しません**が、どうしても無料で実装したい場合：

1. src/claude/analyzer.ts を簡易版に変更
2. 統計ベースのサマリー生成に切り替え
3. ただし、レポートの質は大幅に低下

→ この場合は別途相談してください

---

## 📞 困ったら

実装中に問題が発生したら：

1. 各実装ファイルの「エラー対処」セクションを確認
2. TECHNICAL_GUIDE.md を参照
3. Claude Code に相談

---

## ✅ 確認完了チェックリスト

```
[ ] Claude API が必須化されていることを確認した
[ ] すべての実装計画ファイルに目を通した
[ ] 実装順序を理解した
[ ] コストを確認した（約0.45円/月）
[ ] Claude API Key 取得が必須ステップであることを理解した
```

**すべてチェックがついたら、IMPLEMENTATION_PLAN.md を開いて実装開始！**

---

**明日の作業開始時にこのファイルを必ず読んでください。**
