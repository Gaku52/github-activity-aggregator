# プロジェクト完了計画 - 来週中の完了を目指して

**目標**: 2025年11月30日（土）までに Phase 5 完了
**現在の進捗**: Phase 3 完了（60%）
**残り作業**: Phase 4 + Phase 5

---

## 📊 残り作業の詳細見積もり

### Phase 4: Publisher Lambda 実装（配信機能）

#### タスク詳細

| タスク | 内容 | 所要時間 | 難易度 |
|--------|------|----------|--------|
| **4.1 Publisher Lambda 骨組み** | ディレクトリ作成、package.json、tsconfig.json | 10分 | 易 |
| **4.2 Notion API統合** | Notion APIクライアント実装、認証、ページ作成 | 90分 | 中 |
| **4.3 Slack Webhook統合** | Slack メッセージフォーマット、送信ロジック | 30分 | 易 |
| **4.4 Markdown出力** | ファイル出力機能（GitHub Pages用） | 20分 | 易 |
| **4.5 JSON出力** | JSON API形式での出力 | 15分 | 易 |
| **4.6 エラーハンドリング** | リトライロジック、エラー通知 | 30分 | 中 |
| **4.7 ローカルテスト** | 全配信先のテスト実行、デバッグ | 45分 | 中 |

**Phase 4 合計**: **約4時間**

---

### Phase 5: AWS デプロイ

#### タスク詳細

| タスク | 内容 | 所要時間 | 難易度 |
|--------|------|----------|--------|
| **5.1 AWS Lambda作成（3関数）** | Collector, Generator, Publisher | 30分 | 易 |
| **5.2 デプロイパッケージ作成** | zip作成、依存関係含める | 20分 | 易 |
| **5.3 コードアップロード** | 各Lambda関数にコードアップロード | 15分 | 易 |
| **5.4 環境変数設定** | 全Lambda関数の環境変数設定 | 30分 | 中 |
| **5.5 IAMロール設定** | 実行ロールの作成・権限付与 | 20分 | 中 |
| **5.6 EventBridge設定** | スケジュール作成、トリガー設定 | 20分 | 易 |
| **5.7 手動テスト実行** | 各Lambda関数のテスト実行 | 30分 | 中 |
| **5.8 CloudWatch確認** | ログ確認、エラーデバッグ | 30分 | 中 |
| **5.9 E2Eテスト** | 全体フロー（Collector→Generator→Publisher）確認 | 45分 | 高 |
| **5.10 ドキュメント更新** | デプロイ手順、トラブルシューティング | 30分 | 易 |

**Phase 5 合計**: **約4時間**

---

## ⏱️ 総所要時間

| フェーズ | 作業時間 | 余裕時間 | 合計 |
|---------|---------|---------|------|
| Phase 4 | 4時間 | 1時間 | **5時間** |
| Phase 5 | 4時間 | 1時間 | **5時間** |
| **総計** | **8時間** | **2時間** | **10時間** |

---

## 📅 推奨スケジュール（来週中の完了）

### パターンA: 平日2日 + 週末1日

**Day 1（平日）: 3時間**
- ✅ Notion API の事前準備（APIキー取得、データベース作成）
- ✅ Publisher Lambda 実装（4.1 〜 4.5）

**Day 2（平日）: 2時間**
- ✅ Publisher Lambda 完成（4.6 〜 4.7）
- ✅ Phase 4 完了テスト

**Day 3（週末）: 5時間**
- ✅ AWS デプロイ全作業（Phase 5）
- ✅ E2Eテスト
- ✅ ドキュメント整備

---

### パターンB: 週末集中（2日間）

**土曜日: 5時間**
- 午前（2.5時間）: Phase 4 完全実装
- 午後（2.5時間）: AWS Lambda作成、デプロイ準備

**日曜日: 5時間**
- 午前（3時間）: AWS デプロイ、テスト
- 午後（2時間）: E2Eテスト、ドキュメント

---

### パターンC: 毎日2時間 × 5日

| 曜日 | 作業内容 | 所要時間 |
|------|---------|---------|
| **月** | Notion API準備 + Publisher骨組み | 2時間 |
| **火** | Notion統合実装 | 2時間 |
| **水** | Slack/Markdown/JSON実装 + テスト | 2時間 |
| **木** | AWS Lambda作成 + デプロイ | 2時間 |
| **金** | EventBridge設定 + E2Eテスト | 2時間 |

---

## 🎯 各セッションの具体的タスク

### セッション1: Publisher Lambda 実装（前半）- 3時間

#### 事前準備（15分）
```bash
# Notion準備
1. https://www.notion.so/my-integrations でIntegration作成
2. APIキーをコピー → .env に保存
3. Notionでデータベース作成
4. データベースIDをコピー → .env に保存
```

#### 実装（2時間45分）
```bash
# ディレクトリ作成
mkdir -p lambda/publisher/src

# パッケージ設定
# package.json, tsconfig.json 作成

# メイン実装
# src/index.ts - Publisher Lambda
# src/notion.ts - Notion API クライアント
# src/slack.ts - Slack Webhook クライアント
# src/markdown.ts - Markdown出力

# ビルド & 初期テスト
npm install && npm run build
```

---

### セッション2: Publisher Lambda 実装（後半）- 2時間

#### テスト実装（1時間30分）
```bash
# 各配信先のテスト
npm run test:notion
npm run test:slack
npm run test:markdown

# エラーケースのテスト
# リトライロジックの確認
```

#### Phase 4 完了確認（30分）
```bash
# E2Eテスト
1. Collector実行
2. Generator実行
3. Publisher実行
4. 各配信先で結果確認
```

---

### セッション3: AWS デプロイ - 5時間

#### 準備（30分）
```bash
# AWS Console ログイン確認
# IAMユーザー権限確認
# デプロイパッケージ作成
cd lambda/collector && zip -r collector.zip dist/ node_modules/
cd lambda/generator && zip -r generator.zip dist/ node_modules/
cd lambda/publisher && zip -r publisher.zip dist/ node_modules/
```

#### Lambda作成（1時間）
```
AWS Console → Lambda → Create function × 3

1. github-activity-collector
   - Runtime: Node.js 20.x
   - Memory: 512 MB
   - Timeout: 5分

2. github-activity-generator
   - Runtime: Node.js 20.x
   - Memory: 256 MB
   - Timeout: 2分

3. github-activity-publisher
   - Runtime: Node.js 20.x
   - Memory: 256 MB
   - Timeout: 2分
```

#### 環境変数設定（30分）
```
各Lambda → Configuration → Environment variables

Collector & Generator:
- GITHUB_TOKEN
- GITHUB_USERNAME
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

Publisher（追加）:
- NOTION_ENABLED=true
- NOTION_API_KEY
- NOTION_DATABASE_ID
- SLACK_ENABLED=true
- SLACK_WEBHOOK_URL
```

#### EventBridge設定（30分）
```
EventBridge → Rules → Create rule

1. github-collector-weekly
   - Schedule: cron(0 13 ? * SUN *)  # 毎週日曜22:00 JST
   - Target: github-activity-collector

2. github-generator-weekly
   - Event Pattern: Lambda成功イベント
   - Target: github-activity-generator

3. github-publisher-weekly
   - Event Pattern: Lambda成功イベント
   - Target: github-activity-publisher
```

#### テスト（2時間30分）
```bash
# 個別テスト（各30分）
1. Collector手動実行 → CloudWatch確認
2. Generator手動実行 → CloudWatch確認
3. Publisher手動実行 → Notion/Slack確認

# E2Eテスト（1時間）
1. EventBridgeから手動トリガー
2. 全Lambda実行確認
3. エラーがあれば修正

# ドキュメント作成（30分）
```

---

## ✅ 完了チェックリスト

### Phase 4 完了条件
- [ ] Publisher Lambda が Notion にページ作成できる
- [ ] Slack に週次レポートが送信される
- [ ] Markdown ファイルが正しく出力される
- [ ] JSON 形式でデータエクスポートできる
- [ ] エラー時のリトライが動作する
- [ ] ローカルテストが全て成功

### Phase 5 完了条件
- [ ] 3つの Lambda 関数が AWS にデプロイされている
- [ ] EventBridge スケジュールが設定されている
- [ ] 環境変数が正しく設定されている
- [ ] CloudWatch Logs でログが確認できる
- [ ] 手動テストで Collector → Generator → Publisher が動作
- [ ] 週次スケジュールでの自動実行が確認できる
- [ ] Notion/Slack に実際のレポートが配信される
- [ ] AWS_DEPLOYMENT.md にデプロイ手順が記載されている

---

## 🚨 リスクと対策

### 高リスク項目

| リスク | 対策 | 追加時間 |
|--------|------|----------|
| Notion API の認証エラー | 事前にIntegration作成、テスト実行 | +30分 |
| AWS Lambda のタイムアウト | メモリ・タイムアウト設定を余裕を持たせる | +15分 |
| EventBridge の設定ミス | cron式をローカルで事前確認 | +15分 |
| 環境変数の設定漏れ | チェックリスト作成、項目確認 | +10分 |

**リスク対応の余裕時間**: 合計 **1.5時間** （既に見積もりに含まれている）

---

## 💡 効率化のヒント

### 時間短縮のポイント

1. **Notion API の事前準備**
   - 実装前にIntegration作成とデータベース設計を完了
   - APIキーを `.env` に保存しておく

2. **AWS CLI の活用**
   - コンソール操作より高速
   - スクリプト化で再利用可能

3. **デプロイパッケージの事前作成**
   - Phase 4 完了時点でzipファイル作成
   - デプロイ当日はアップロードのみ

4. **並行作業**
   - Lambda作成中に別タブで環境変数準備
   - EventBridge設定とドキュメント作成を並行

---

## 📝 推奨する進め方

### ベストプラクティス

**パターンA（平日2日 + 週末1日）を推奨する理由**:
1. ✅ 作業を分散できる（疲労軽減）
2. ✅ 各フェーズでのエラー修正時間が確保できる
3. ✅ Notion API準備を事前に完了できる
4. ✅ 週末に集中してデプロイ完了できる

### 理想的なスケジュール例

**11月25日（月）: 3時間**
- Notion Integration作成（15分）
- Publisher Lambda 実装開始（2時間45分）

**11月27日（水）: 2時間**
- Publisher Lambda 完成・テスト
- Phase 4 完了

**11月30日（土）: 5時間**
- AWS デプロイ完全実施
- E2Eテスト
- **プロジェクト完了！🎉**

---

## 🎯 成功のための重要ポイント

### 必ずやるべきこと

1. **事前準備を徹底する**
   - Notion API キーを事前取得
   - AWS Console にログインできるか事前確認
   - 環境変数リストを準備

2. **小さく区切ってテストする**
   - 各機能実装後、必ずローカルテスト
   - AWS デプロイ後、1関数ずつ確認

3. **ドキュメントを残す**
   - 詰まったポイント、解決方法をメモ
   - 次回デプロイ時の参考資料に

4. **焦らない**
   - エラーが出たら落ち着いてログ確認
   - CloudWatch Logs を丁寧に読む

---

## 📊 まとめ

### 必要時間
- **最小**: 8時間（作業のみ）
- **推奨**: 10時間（余裕あり）
- **最大**: 12時間（初めてAWS使う場合）

### 実現可能性
- ✅ **来週中の完了は十分可能**
- ✅ 平日2日（各2-3時間）+ 週末1日（5時間）で達成可能
- ✅ AWSの経験があるなら、さらにスムーズ

### 次回セッション開始時に確認すること
1. [ ] Notion Integration を作成済みか？
2. [ ] Notion データベースを作成済みか？
3. [ ] Slack Webhook URL を取得済みか？
4. [ ] AWS Console にログインできるか？
5. [ ] 10時間の作業時間を確保できるか？

---

**作成日**: 2025-11-23
**目標完了日**: 2025-11-30（土）
**見積もり精度**: 90%（AWS経験あり想定）
