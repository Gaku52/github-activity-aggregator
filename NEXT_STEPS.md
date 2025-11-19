# 🚀 Next Steps - GitHub Activity Aggregator

最終更新: 2025-11-18

---

## ✅ 完了した作業

### Supabaseセットアップ（完全完了）
- ✅ データベーススキーマ作成（5テーブル、2ビュー）
- ✅ セキュリティ設定完全化（0 errors, 0 warnings, 0 info）
- ✅ RLS有効化 + ポリシー設定
- ✅ マイグレーション4つ作成・適用
- ✅ ドキュメント整備
- ✅ Gitにコミット・プッシュ済み

### 環境設定
- ✅ `.env` ファイル設定済み
- ✅ Supabase CLI 連携済み
- ✅ PostgreSQL クライアント導入済み

---

## 🎯 次にやるべきこと

### Phase 1: データ収集機能の実装

#### 1-1. GitHub API連携
**目的**: GitHubからリポジトリ情報とコミット履歴を取得

```typescript
// lambda/collector/src/services/github.ts
// 実装するべき機能:
// - リポジトリ一覧取得
// - コミット履歴取得
// - レート制限対応
```

**必要なタスク**:
- [ ] GitHub Personal Access Token 取得・設定
- [ ] Octokitクライアントのセットアップ
- [ ] リポジトリ情報取得関数の実装
- [ ] コミット履歴取得関数の実装
- [ ] エラーハンドリング・リトライロジック

#### 1-2. Supabaseへのデータ保存
**目的**: 取得したデータをSupabaseに保存

```typescript
// lambda/collector/src/services/supabase.ts
// 実装するべき機能:
// - リポジトリデータの保存・更新
// - コミットデータのバルクインサート
// - 重複チェック（UPSERT）
```

**必要なタスク**:
- [ ] Supabaseクライアント初期化
- [ ] リポジトリUPSERT関数
- [ ] コミットバルクインサート関数
- [ ] トランザクション処理

#### 1-3. Lambda関数の完成
**目的**: 定期実行可能なLambda関数を作成

**必要なタスク**:
- [ ] メイン処理フローの実装
- [ ] 環境変数の検証
- [ ] ローカルテスト
- [ ] デプロイ準備（SAM template）

---

### Phase 2: データ集計機能

#### 2-1. 週次アクティビティ集計
**目的**: コミットデータから週次統計を生成

```typescript
// lambda/aggregator/src/index.ts
// 実装するべき機能:
// - 週次データの集計（commits → weekly_activities）
// - 言語分布の計算
// - コントリビューター一覧の作成
```

**必要なタスク**:
- [ ] 集計ロジックの実装
- [ ] SQL最適化
- [ ] Lambda関数作成

#### 2-2. プラットフォーム統計
**目的**: 全リポジトリ横断の統計を生成

**必要なタスク**:
- [ ] 日次統計計算
- [ ] アクティビティヒートマップ生成
- [ ] Lambda関数作成

---

### Phase 3: レポート生成機能

#### 3-1. Markdownレポート生成
**目的**: 週次レポートをMarkdown形式で生成

**必要なタスク**:
- [ ] テンプレートエンジンの選定
- [ ] レポート生成ロジック
- [ ] GitHub Pages向けの整形

#### 3-2. Notion連携（オプション）
**目的**: 週次レポートをNotionに自動投稿

**必要なタスク**:
- [ ] Notion API トークン取得
- [ ] Notion クライアント実装
- [ ] ページ作成・更新ロジック

---

### Phase 4: デプロイ・自動化

#### 4-1. AWS SAM デプロイ
**必要なタスク**:
- [ ] SAM template 作成
- [ ] IAMロール設定
- [ ] デプロイスクリプト作成

#### 4-2. スケジュール設定
**必要なタスク**:
- [ ] EventBridge Scheduleの設定
- [ ] データ収集: 毎日1回
- [ ] 週次集計: 毎週月曜日
- [ ] レポート生成: 毎週月曜日午前

---

## 📋 推奨作業順序

### Step 1: GitHub API連携（優先度: 高）
```bash
# 作業内容
1. GitHub Personal Access Token 取得
2. lambda/collector/src/services/github.ts 実装
3. リポジトリ情報取得のテスト
```

### Step 2: Supabase保存（優先度: 高）
```bash
# 作業内容
1. lambda/collector/src/services/supabase.ts 実装
2. repositories テーブルへの保存テスト
3. commits テーブルへの保存テスト
```

### Step 3: Lambda完成とテスト（優先度: 高）
```bash
# 作業内容
1. メイン処理フローの完成
2. ローカルでの動作確認
3. エラーハンドリングの追加
```

### Step 4: 週次集計（優先度: 中）
```bash
# 作業内容
1. 集計SQLの作成・テスト
2. Lambda関数の実装
3. テストデータでの検証
```

### Step 5: レポート生成（優先度: 中）
```bash
# 作業内容
1. Markdownテンプレート作成
2. レポート生成ロジック実装
3. 出力確認
```

### Step 6: デプロイ（優先度: 低）
```bash
# 作業内容
1. SAM template 作成
2. AWS環境へのデプロイ
3. スケジュール設定
```

---

## 🔧 必要な準備

### GitHub Personal Access Token
**スコープ**:
- `repo` (全て)
- `read:org` (組織のリポジトリにアクセスする場合)

**取得方法**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. 必要なスコープを選択
4. `.env` に追加: `GITHUB_TOKEN=ghp_xxxxx`

### Notion Integration Token（オプション）
**取得方法**:
1. https://www.notion.so/my-integrations
2. New integration 作成
3. Token コピー
4. `.env` に追加: `NOTION_TOKEN=secret_xxxxx`

---

## 📚 参考資料

### ドキュメント
- `supabase/SETUP_COMPLETE.md` - Supabaseセットアップ完了ドキュメント
- `supabase/README.md` - Supabaseセットアップガイド
- `SPECIFICATION.md` - プロジェクト仕様書
- `TECHNICAL_GUIDE.md` - 技術ガイド

### Supabase接続情報
- URL: `https://pzsrzoxdixcmaeialfjh.supabase.co`
- 使用するキー: `SUPABASE_SERVICE_KEY`（Lambda用）

### GitHub Repository
- https://github.com/Gaku52/github-activity-aggregator

---

## 💡 Tips

### ローカルテスト
```bash
# Lambda関数のローカルテスト
cd lambda/collector
npm run dev
```

### Supabase接続確認
```bash
# psql で直接接続
/opt/homebrew/opt/libpq/bin/psql "postgresql://postgres:ExistennisAA32@db.pzsrzoxdixcmaeialfjh.supabase.co:5432/postgres"
```

### マイグレーション確認
```bash
# 適用済みマイグレーション確認
supabase db dump --linked -p ExistennisAA32 --schema public
```

---

## 🎯 最初の実装目標

**「1つのリポジトリから1週間分のコミットを取得してSupabaseに保存する」**

これができれば、あとは拡張するだけです！

---

次のセッションで楽しみましょう！🚀
