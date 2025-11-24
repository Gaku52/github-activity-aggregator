# 日次記録ルール

## 目的

- その日の学習内容と成果を記録する
- GitHubのコミットから学習内容を自動解析する
- 継続的な学習習慣を可視化する

## 実施タイミング

- 毎日の学習終了後
- 所要時間: 1分程度（自動実行）

## 実行方法

```bash
cd /Users/gaku/github-activity-aggregator
npm run daily
```

## 記録内容

### 自動記録される項目

#### GitHubアクティビティ
- その日のコミット一覧
- 変更したリポジトリ
- コミット数

#### Claude分析結果
- 学習内容の箇条書きサマリー
- 技術的なポイントの説明
- 主な成果

#### API使用状況
- Input tokens
- Output tokens
- Total tokens
- 推定コスト（USD）
- 推定コスト（円換算）

### 保存先

- **Notion**: 日次記録データベース
- **Supabase**: daily_reports テーブル

## 記録フォーマット（Notion）

```
タイトル: YYYY-MM-DD

## 今日の学習内容
- [箇条書き] 主な学習内容
- [箇条書き] 技術的なポイント
- [箇条書き] 成果や進捗

（必要に応じて説明文を追加）

---

### 統計情報
- コミット数: X件
- Claude API使用量: X,XXX tokens
- 推定コスト: $0.XXXXXX (約¥X.XX)
```

## 記録の活用

### 日次レビュー
- その日の学習を振り返る
- 理解が浅い部分を特定
- 翌日の学習計画を立てる

### 週次レビュー
- 1週間の学習内容を俯瞰
- 学習の進捗を確認
- 次週の目標設定

### 月次レビュー
- 1ヶ月の成長を確認
- 学習パターンの分析
- API使用コストの確認

## 注意事項

- コミットメッセージは具体的に書く
  - ❌ 「Update」「Fix」
  - ✅ 「Add user authentication feature」「Fix login validation bug」

- 1日1回の実行を推奨
  - 複数回実行しても同じ日付は上書きされる

- Notion データベースの設定
  - Name プロパティが必要
  - 日付形式: YYYY-MM-DD

## トラブルシューティング

### コミットが0件の場合
- その日のコミットがなければ記録はスキップされる
- 学習した内容は手動でNotionに記録することを推奨

### API エラーが発生した場合
1. .env ファイルの設定を確認
   - GITHUB_TOKEN
   - CLAUDE_API_KEY
   - NOTION_API_KEY
   - NOTION_DATABASE_ID
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY

2. APIの利用制限を確認
   - GitHub: 5,000 requests/hour
   - Claude: アカウントの上限確認
   - Notion: 3 requests/second

### データベースエラーの場合
```bash
# マイグレーション適用
supabase db push --linked
```

## コスト管理

### Claude API の料金（Haiku）
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

### 1日あたりの推定コスト
- 平均 500 tokens 使用の場合: 約 $0.002 (約 ¥0.30)
- 月間（30日）: 約 $0.06 (約 ¥9)
- 年間（365日）: 約 $0.73 (約 ¥110)

### コスト削減のヒント
- コミットメッセージを簡潔に保つ
- 不要なコミットをまとめる
- 大量のコミットがある日は要注意

## 記録の継続のコツ

- 毎日同じ時間に実行する習慣をつける
- コミットメッセージに学習内容を含める
- 週次レビューで振り返る
- 成長の記録として楽しむ

---

**作成日**: 2025-11-24
