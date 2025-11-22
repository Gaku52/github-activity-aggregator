# Notion API セットアップガイド

## 現在の状態

- ✅ Notion API Key: 設定済み
- ✅ Database ID: 設定済み
- ❌ エラー: データベースがインテグレーションと共有されていない

## 解決手順

### 1. Notionでデータベースを開く

.envファイルに設定した`NOTION_DATABASE_ID`を使って、以下の形式でデータベースにアクセスしてください：
```
https://www.notion.so/{DATABASE_IDのハイフンを除いた形式}
```

### 2. インテグレーションを追加

1. データベースページ右上の「**...**」（3点メニュー）をクリック
2. 「**コネクト**」または「**Add connections**」を選択
3. 作成済みのインテグレーション（名前を確認）を選択
4. 「**許可する**」をクリック

### 3. インテグレーション名の確認

もしインテグレーション名が不明な場合：

1. https://www.notion.so/my-integrations にアクセス
2. .envファイルに設定したAPI Keyに対応するインテグレーションを探す
3. その名前を確認

### 4. 接続テスト

設定完了後、以下のコマンドで接続を確認：

```bash
npx tsx test-apis.ts
```

または、Notion専用テスト：

```bash
npx tsx test-notion-detailed.ts
```

## 必要な権限

このプロジェクトでは以下の権限が必要です：

- ✅ **Read content**: データベースの読み取り
- ✅ **Update content**: ページの更新
- ✅ **Insert content**: 新しいページの作成

## トラブルシューティング

### エラー: "Could not find database"
→ データベースがインテグレーションと共有されていません。上記手順2を実行してください。

### エラー: "Unauthorized"
→ API Keyが間違っているか、期限切れです。新しいAPI Keyを生成してください。

### データベースIDの確認方法

データベースURLから取得：
```
https://www.notion.so/workspace/DATABASE_ID?v=...
                              ↑ここ（ハイフンなし32文字）
```

## 参考リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Notion Integrations](https://www.notion.so/my-integrations)
