# 実装計画書 - 4日目（EventBridge設定・完成）

**作業時間**: 21:00-22:00（1時間）
**前提**: 3日目（Lambda デプロイ）が完了している

---

## 🎯 4日目の目標

**ゴール**: 週次自動実行を設定して完成

```
[ ] EventBridge Scheduler 作成
[ ] Lambda トリガー設定
[ ] Cron式設定（毎週日曜22:00 JST）
[ ] 実行ロール作成
[ ] 次回実行日時の確認
[ ] 完成！
```

**所要時間**: 1時間

---

## 📋 作業開始前の確認

### 確認事項

```
[ ] 3日目の Lambda テスト実行が成功している
[ ] Lambda で Notion 投稿ができている
[ ] Lambda 関数名: github-activity-collector
```

---

## 📅 Step 7-1: EventBridge Scheduler 作成（30分）

### AWS Console で作成

```
[ ] 1. AWS Console → EventBridge
[ ] 2. 左メニュー「スケジュール」→「スケジュールを作成」
```

### スケジュール詳細

```
[ ] 3. スケジュール名: github-activity-weekly
[ ] 4. 説明: GitHub Activity Aggregator 週次実行
[ ] 5. スケジュールグループ: default
```

### スケジュールパターン設定

```
[ ] 6. スケジュールパターン:
      ○ 繰り返しスケジュール
[ ] 7. スケジュールタイプ:
      ○ Cron ベースのスケジュール
[ ] 8. Cron 式: cron(0 13 ? * SUN *)
[ ] 9. タイムゾーン: UTC
[ ] 10. 「次へ」をクリック
```

**Cron式の意味**:
```
cron(0 13 ? * SUN *)
     0  13 ?  * SUN  *
     │  │  │  │  │   │
     分 時 日 月 曜日 年

0 分: 0分（00分ちょうど）
13 時: 13時（UTC）= 22時（JST）
? 日: 指定しない（曜日を優先）
* 月: 毎月
SUN 曜日: 日曜日
* 年: 毎年

→ 毎週日曜 13:00 UTC = 22:00 JST
```

### フレキシブルなタイムウィンドウ

```
[ ] 11. フレキシブルなタイムウィンドウ:
       ○ オフ
[ ] 12. 「次へ」をクリック
```

---

## 🎯 Step 7-2: ターゲット設定（15分）

### ターゲット詳細

```
[ ] 1. ターゲット API: すべての API
[ ] 2. AWS Lambda の「Invoke」を選択
```

### Lambda 関数選択

```
[ ] 3. Lambda 関数: github-activity-collector
[ ] 4. ペイロード: 空（デフォルトのまま）
```

### 再試行ポリシー

```
[ ] 5. 再試行ポリシー:
      最大保持期間: 24時間
      最大再試行回数: 2
[ ] 6. 「次へ」をクリック
```

---

## 🔐 Step 7-3: アクセス許可設定（10分）

### 実行ロール

```
[ ] 1. 実行ロール:
      ○ この操作用の新しいロールを作成する
[ ] 2. 「次へ」をクリック
```

### 確認と作成

```
[ ] 3. すべての設定を確認
[ ] 4. 「スケジュールを作成」をクリック
```

---

## ✅ Step 7-4: 動作確認（5分）

### スケジュール確認

```
[ ] 1. EventBridge → スケジュール
[ ] 2. github-activity-weekly が表示される
[ ] 3. スケジュールをクリック
```

### 次回実行日時確認

```
[ ] 4. スケジュールの詳細画面
[ ] 5. 「次回のスケジュール実行」を確認

例: 2025年11月17日 13:00 UTC (22:00 JST)
```

### Lambda トリガー確認

```
[ ] 6. Lambda → github-activity-collector
[ ] 7. 「設定」タブ → 「トリガー」
[ ] 8. EventBridge (CloudWatch Events) が追加されている
```

---

## 🧪 Step 7-5: 手動トリガーテスト（任意）

EventBridge Scheduler は手動トリガーできないので、Lambda で直接テストします。

```
[ ] 1. Lambda → github-activity-collector
[ ] 2. 「テスト」タブ
[ ] 3. 「テスト」ボタンをクリック
[ ] 4. 成功することを確認
```

---

## 🎉 完成チェックリスト

### 最終確認

```
[ ] EventBridge Scheduler が作成された
[ ] Cron式が正しい（cron(0 13 ? * SUN *)）
[ ] Lambda トリガーが設定された
[ ] 次回実行日時が正しい（次の日曜22:00 JST）
[ ] Lambda で手動実行が成功する
[ ] Notion にページが作成される
```

---

## 🎊 完成！

**おめでとうございます！週次自動化システムが完成しました！**

### 今後の動作

1. **毎週日曜 22:00（JST）に自動実行**
   - EventBridge が Lambda をトリガー
   - Lambda が GitHub → Claude → Supabase → Notion の処理を実行
   - 約10-30秒で完了

2. **月曜の朝、Notion を確認**
   - 週次レポートが自動で投稿されている
   - 読んで終わり

3. **手動実行も可能**
   - Lambda の「テスト」ボタンでいつでも実行できる

---

## 📊 コスト確認

### 月次コスト（週次実行の場合）

| サービス | 料金 | 備考 |
|---------|------|------|
| AWS Lambda | $0 | 無料枠内 |
| EventBridge | $0 | 無料枠内 |
| Supabase | $0 | 既存Pro契約内 |
| GitHub API | $0 | 無料 |
| Claude API | ~$0.03 | 約4円/月 |
| Notion API | $0 | 無料 |
| **合計** | **~$0.03** | **約4円/月** |

---

## 🔧 メンテナンス

### 実行履歴の確認

```
Lambda → モニタリング → CloudWatch のログを表示
→ 毎週の実行ログが確認できる
```

### 実行時間を変更したい場合

```
EventBridge → スケジュール → github-activity-weekly → 編集
→ Cron式を変更

例:
毎週月曜 9:00 JST → cron(0 0 ? * MON *)
毎日 22:00 JST → cron(0 13 * * ? *)
```

### エラーが発生した場合

```
1. CloudWatch Logs でエラー内容を確認
2. BEGINNER_GUIDE.md のトラブルシューティングを参照
3. Lambda の環境変数を再確認
4. 手動実行で再現するか確認
```

---

## 🚀 今後の拡張アイデア

### すぐにできる拡張

1. **Slack 通知追加**
   - Slack Webhook URL を環境変数に追加
   - src/slack/client.ts を作成
   - Notion投稿後にSlackにも通知

2. **月次レポート追加**
   - 別の EventBridge スケジュール作成
   - 月初に実行（cron(0 0 1 * ? *)）
   - 過去30日分を集計

3. **複数Notionデータベース対応**
   - プロジェクト別にデータベースを分ける
   - 環境変数で複数DB IDを管理

### 将来的な拡張

1. **Web ダッシュボード**
   - Next.js + Supabase でダッシュボード作成
   - 過去のレポート一覧表示
   - グラフで可視化

2. **より高度な分析**
   - コード品質分析
   - 技術スタック変化の検出
   - 生産性トレンド分析

3. **CLI ツール化**
   - npm パッケージとして公開
   - 他のユーザーも使えるように
   - MONETIZATION_STRATEGY.md の計画を実行

---

## 📚 関連ドキュメント

- **BEGINNER_GUIDE.md**: 初心者向け完全ガイド
- **TECHNICAL_GUIDE.md**: 技術詳細
- **MONETIZATION_STRATEGY.md**: 収益化戦略
- **SPECIFICATION.md**: システム仕様
- **IMPLEMENTATION_PLAN.md**: 実装計画（1日目）
- **IMPLEMENTATION_DAY2.md**: 2日目の実装
- **IMPLEMENTATION_DAY3.md**: 3日目の実装

---

## 🎓 学んだこと

この4日間で以下を習得しました:

- ✅ AWS Lambda の使い方
- ✅ EventBridge Scheduler の設定
- ✅ Supabase の使い方
- ✅ GitHub API の使い方
- ✅ Claude API の使い方
- ✅ Notion API の使い方
- ✅ TypeScript でのサーバーレス開発
- ✅ IAM Role の基本
- ✅ Cron式の理解
- ✅ サーバーレスアーキテクチャの設計

---

**🎉 完成おめでとうございます！**

**週次レポートを楽しみに待ちましょう！**
