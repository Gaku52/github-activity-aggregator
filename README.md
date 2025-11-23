# GitHub Activity Aggregator

**全GitHubリポジトリの活動を自動収集・分析し、複数の出力先に進捗報告を行う自動化システム**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange.svg)](https://aws.amazon.com/lambda/)

---

## 🎯 概要

GitHub Activity Aggregatorは、開発者の全GitHubリポジトリを定期的にスキャンし、活動状況を自動で収集・分析・レポート生成するサーバーレスシステムです。

### 主な機能

- ✅ **自動データ収集**: GitHub API経由で全リポジトリの活動を取得
- 📊 **インテリジェント分析**: コミット統計、言語分析、活動パターン検出
- 📤 **マルチチャンネル配信**: Notion、Slack、Markdown、JSONなど複数形式で出力
- ⏰ **完全自動化**: 週次/月次で自動実行、手動作業ゼロ
- 💰 **コストゼロ**: AWS無料枠 + Supabase Pro契約内で運用可能

---

## 🏗️ アーキテクチャ

```
EventBridge → Lambda (Collector) → Supabase
                ↓
          Lambda (Generator) → Supabase
                ↓
          Lambda (Publisher) → Notion / Slack / etc.
```

詳細は [SPECIFICATION.md](./SPECIFICATION.md) を参照

---

## 📋 技術スタック

- **AWS Lambda**: サーバーレス実行環境
- **AWS EventBridge**: スケジューラ
- **Supabase Pro**: PostgreSQL データベース + ストレージ（100GB）
- **TypeScript**: 型安全な実装
- **GitHub API**: リポジトリデータ取得
- **Notion API**: 進捗データベース
- **Slack Webhook**: リアルタイム通知

---

## 🚀 ステータス

**現在**: Phase 2 完了 - Collector Lambda 実装・テスト完了

### 完了した実装

- ✅ **Phase 1**: Supabase データベース設計・セットアップ
- ✅ **Phase 2**: GitHub Collector Lambda 実装
  - 43個のリポジトリ収集成功
  - コミット履歴の自動保存
  - ローカルテスト完了

### 次のステップ

- 🔄 **Phase 3**: Report Generator Lambda 実装（進行中）
- ⏳ **Phase 4**: Publisher Lambda 実装（Notion/Slack連携）
- ⏳ **Phase 5**: AWS デプロイ

---

## 📚 ドキュメント

- [完全仕様書](./SPECIFICATION.md) - システム全体の詳細設計
- [実装ガイド](./IMPLEMENTATION.md) - 実装時の手順（作成予定）
- [セットアップガイド](./SETUP.md) - 環境構築方法（作成予定）

---

## 💰 コスト

**追加コスト: $0/月**

- AWS Lambda: 無料枠内
- EventBridge: 無料枠内
- Supabase: 既存Pro契約内（100GB）
- GitHub API: 無料

詳細は [SPECIFICATION.md](./SPECIFICATION.md) のコスト詳細を参照

---

## 🔐 環境変数

```bash
# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_USERNAME=Gaku52

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...

# Notion
NOTION_API_KEY=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

---

## 📅 次のステップ

1. **技術学習** - AWS Lambda、EventBridge、Supabaseの理解
2. **環境準備** - AWS、Supabase、GitHub APIの設定
3. **プロトタイプ** - 小規模実装で動作確認
4. **本実装** - Phase 1から順次実装

---

## 📄 ライセンス

MIT License

---

## 👤 作成者

Gaku52

---

**作成日**: 2025-11-15

---

## 📝 進捗履歴

### 2025-11-23
- ✅ Collector Lambda のローカルテスト実行成功
- ✅ GitHub API からリポジトリ43個、コミット15件を収集
- ✅ Supabase への自動保存確認完了
- 🎯 Phase 2 完了

### 2025-11-19
- ✅ Supabase データベース設計完了
- ✅ REST API 接続確認
- ✅ 全テーブル・ビュー作成完了
