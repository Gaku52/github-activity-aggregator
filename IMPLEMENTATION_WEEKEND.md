# 実装計画書 - 週末集中プラン（1-2日で完成）

**対象**: 土日に集中して実装したい人向け
**作業時間**: 4-5時間/日
**目標**: 1-2日で完成させる

---

## 📅 2つの選択肢

### プラン A: 1日集中（5-6時間）

**おすすめ度**: ★★☆☆☆（リスク高い）

```
09:00-10:00  アカウント準備 + 環境構築
10:00-12:00  Step 1-4（個別API テスト）
12:00-13:00  昼休憩
13:00-15:00  Step 5（統合スクリプト）
15:00-15:30  休憩
15:30-17:00  Step 6-7（Lambda + EventBridge）
17:00-18:00  デバッグ・最終確認
```

**リスク**:
- Lambda デプロイで詰まったら時間オーバー
- 疲労でミスが増える
- 初めてだと6時間では厳しい可能性

### プラン B: 2日間（4-5時間/日）← 推奨

**おすすめ度**: ★★★★★（確実）

**土曜日（4時間）**:
```
10:00-11:00  アカウント準備 + BEGINNER_GUIDE 熟読
11:00-13:00  Step 1-4（個別APIテスト）
13:00-14:00  昼休憩
14:00-16:00  Step 5（統合スクリプト完成）
16:00-17:00  ローカルテスト・動作確認
```

**日曜日（3-4時間）**:
```
10:00-12:00  Step 6（Lambda デプロイ）
12:00-13:00  昼休憩
13:00-14:00  Step 7（EventBridge 設定）
14:00-15:00  最終確認・ドキュメント整理
```

---

## 🎯 プラン B（推奨）の詳細

### 土曜日のゴール

**10:00-11:00: アカウント準備（1時間）**

```
[ ] AWS アカウント作成（15分）
[ ] Claude API Key 取得（$5チャージ）（10分）
[ ] GitHub Token 取得（5分）
[ ] BEGINNER_GUIDE.md のレベル1を読む（30分）
```

**11:00-11:30: Step 1（GitHub API）**

```bash
cd ~/github-activity-aggregator
npm init -y
npm install dotenv tsx typescript @types/node -D

# .env 作成
# test-github.ts 作成
# 実行

[ ] リポジトリ一覧取得成功
```

**11:30-12:00: Step 2（Claude API）**

```bash
npm install @anthropic-ai/sdk

# test-claude.ts 作成
# 実行

[ ] コミット分析成功
```

**12:00-12:30: Step 3（Supabase）**

```bash
npm install @supabase/supabase-js

# Supabase でテーブル作成
# test-supabase.ts 作成
# 実行

[ ] データ保存成功
```

**12:30-13:00: Step 4（Notion）**

```bash
# test-notion.ts 作成
# 実行

[ ] Notion 投稿成功
```

**13:00-14:00: 昼休憩**

ここまでで個別機能がすべて動く状態。

**14:00-16:00: Step 5（統合スクリプト）**

```bash
mkdir -p src/{github,claude,supabase,notion}

# src/github/client.ts 作成（20分）
# src/claude/analyzer.ts 作成（15分）
# src/supabase/client.ts 作成（15分）
# src/notion/client.ts 作成（15分）
# src/index.ts 作成（30分）

# テスト実行
npm run start

[ ] ローカルで全機能動作
```

**16:00-17:00: 動作確認・調整**

```
[ ] Notion にページが作成される
[ ] Supabase にデータが保存される
[ ] エラーがない
[ ] コードを GitHub にプッシュ
```

**土曜日完了！お疲れ様でした。**

---

### 日曜日のゴール

**10:00-10:30: 前日の復習**

```
[ ] 前日のコードが動くか再確認
[ ] npm run start で成功するか確認
```

**10:30-11:00: IAM Role 作成**

```
[ ] AWS Console → IAM → ロール作成
[ ] lambda-github-activity-role 作成
[ ] ARN をコピー
```

**11:00-11:30: Lambda 用コード準備**

```bash
# src/lambda.ts 作成
# tsconfig.json 確認
```

**11:30-12:00: デプロイパッケージ作成**

```bash
npm run build
npm install --production
zip -r function.zip dist node_modules package.json

[ ] function.zip 作成完了
```

**12:00-13:00: 昼休憩**

**13:00-13:30: Lambda 関数作成**

```
[ ] AWS Console → Lambda → 関数作成
[ ] github-activity-collector 作成
[ ] コードアップロード（function.zip）
```

**13:30-14:00: 環境変数・設定**

```
[ ] 環境変数7つ設定
[ ] タイムアウト60秒
[ ] メモリ512MB
[ ] ハンドラー: dist/lambda.handler
```

**14:00-14:30: Lambda テスト実行**

```
[ ] テストイベント作成
[ ] 実行
[ ] Notion にページ作成される
[ ] 成功！
```

**14:30-15:00: EventBridge 設定**

```
[ ] EventBridge Scheduler 作成
[ ] Cron式: cron(0 13 ? * SUN *)
[ ] Lambda トリガー設定
[ ] 次回実行日時確認
```

**15:00-15:30: 最終確認**

```
[ ] Lambda で手動実行が成功する
[ ] EventBridge のスケジュールが正しい
[ ] すべてのドキュメントを確認
[ ] GitHub に最終コミット
```

**日曜日完了！完成！🎉**

---

## ⏱️ 時間配分の目安

### 土曜日（合計4-5時間）

| 時間 | 作業内容 | 累計 |
|-----|---------|------|
| 1時間 | アカウント準備 | 1時間 |
| 2時間 | Step 1-4（個別テスト） | 3時間 |
| 2時間 | Step 5（統合） | 5時間 |

### 日曜日（合計3-4時間）

| 時間 | 作業内容 | 累計 |
|-----|---------|------|
| 30分 | 前日の復習 | 0.5時間 |
| 2時間 | Step 6（Lambda） | 2.5時間 |
| 30分 | Step 7（EventBridge） | 3時間 |
| 30分 | 最終確認 | 3.5時間 |

---

## 🚨 よくあるハマりポイントと対策

### 土曜日

**ハマりポイント1: Node.js のバージョンが古い**
```
対策: 最初に node --version 確認
18以上でなければ先にアップデート
```

**ハマりポイント2: Supabase のテーブル作成で RLS エラー**
```
対策: ALTER TABLE ... DISABLE ROW LEVEL SECURITY; を忘れずに
```

**ハマりポイント3: Notion の Database ID が間違っている**
```
対策: Notion の URL から正しい ID をコピー
https://notion.so/xxxxx?v=yyyyy → xxxxx が Database ID
```

### 日曜日

**ハマりポイント4: Lambda のパッケージに node_modules が含まれていない**
```
対策: zip -r function.zip dist node_modules package.json
      node_modules も含めることを忘れずに
```

**ハマりポイント5: IAM Role の ARN がコピーできていない**
```
対策: IAM → ロール → 作成したロール → ARN をコピー
      必ずメモ帳に保存
```

**ハマりポイント6: Lambda のタイムアウトが短すぎる**
```
対策: デフォルトは3秒
      必ず60秒に変更
```

---

## 📝 事前準備チェックリスト

### 金曜日の夜にやっておくと良いこと

```
[ ] BEGINNER_GUIDE.md を読む（30分）
[ ] IMPLEMENTATION_PLAN.md を読む（15分）
[ ] Node.js 18以上がインストールされているか確認
[ ] AWS アカウントを作成しておく（15分）
[ ] Claude API アカウントを作成しておく（10分）
[ ] GitHub Token を取得しておく（5分）
[ ] すべての環境変数を ~/.github-activity-env.txt に保存
```

**金曜の準備に1時間使えば、土曜はスムーズに開始できます。**

---

## 🎯 成功のコツ

### 1. 焦らない

```
✅ 1つずつ確実に進める
✅ エラーが出たら落ち着いて読む
✅ 分からなかったら BEGINNER_GUIDE.md を見直す
```

### 2. 小まめに確認

```
✅ Step 1 が成功したら次へ
✅ Step 2 が成功したら次へ
✅ 動かないまま次に進まない
```

### 3. 休憩を取る

```
✅ 2時間ごとに10-15分休憩
✅ 昼休憩は1時間しっかり取る
✅ 詰まったら一度離れる
```

### 4. ログを読む習慣

```
✅ エラーメッセージをしっかり読む
✅ console.log で状況確認
✅ CloudWatch Logs でデバッグ
```

---

## 🛠️ トラブル時の対処

### 土曜日に詰まった場合

**オプション1: 統合を翌日に延期**
```
土曜: Step 1-4 まで完璧にする
日曜: Step 5-7 を実施
```

**オプション2: 助けを求める**
```
エラーメッセージを Claude Code に貼り付けて質問
GitHub の issue で質問
```

### 日曜日に詰まった場合

**オプション1: ローカル実行で満足**
```
Step 5 まで完成していれば、手動実行は可能
Lambda デプロイは後日挑戦
```

**オプション2: 平日に分割**
```
日曜: Lambda デプロイまで
月曜: EventBridge 設定（30分）
```

---

## 📊 完成後の確認事項

### 最終チェックリスト

```
[ ] ローカルで npm run start が成功する
[ ] Lambda で手動実行が成功する
[ ] Notion にページが作成される
[ ] Supabase にデータが保存される
[ ] EventBridge のスケジュールが正しい
[ ] 次回実行日時が表示される
[ ] すべてのコードが GitHub にプッシュされている
```

---

## 🎉 完成！

**2日間お疲れ様でした！**

次の日曜22:00に自動実行されます。楽しみに待ちましょう！

---

## 📚 参考ドキュメント

実装中に困ったら：

- **BEGINNER_GUIDE.md**: 基礎知識・用語説明
- **IMPLEMENTATION_PLAN.md**: 1日目の詳細手順
- **IMPLEMENTATION_DAY2.md**: 2日目の詳細手順
- **IMPLEMENTATION_DAY3.md**: 3日目の詳細手順
- **IMPLEMENTATION_DAY4.md**: 4日目の詳細手順
- **TECHNICAL_GUIDE.md**: 技術的な詳細

---

**成功を祈っています！頑張ってください！**
