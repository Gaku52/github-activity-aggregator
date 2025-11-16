# 初心者向け完全ガイド - ゼロから理解する週次自動化

**対象**: AWS、Lambda、API を触ったことがない人
**目標**: 技術的な前提知識ゼロから週次自動化システムを構築できる

---

## 📚 このガイドの読み方

このガイドは **3つのレベル** に分かれています：

### レベル1: 基礎知識（必読）
まず最初に読む部分。専門用語を日常的な言葉で説明します。

### レベル2: 実践準備（必読）
実際に手を動かす前の準備。アカウント作成など。

### レベル3: 実装（順次実施）
小さなステップに分けて、1つずつ理解しながら進めます。

---

## 🎯 レベル1: 基礎知識（必読）

### そもそも「週次自動化」って何をするの？

**やりたいこと**:
毎週日曜の夜、自動で以下を実行
1. 自分の全GitHubリポジトリをチェック
2. 今週書いたコードを集計
3. AIに分析させる
4. Notionに進捗レポートを投稿

**現状の手作業**:
- GitHub を開いて各リポジトリを確認（10分）
- コミットを読んで何をしたか思い出す（20分）
- Notion にまとめを書く（15分）
- **合計: 45分/週**

**自動化後**:
- 何もしない
- 日曜の夜に自動でNotionに投稿される
- **所要時間: 0分**

---

### 基本用語を日常語で説明

#### API とは？

**専門的な説明**: Application Programming Interface
**日常的な説明**: ソフトウェア同士が会話する方法

**例え話**:
```
あなた: レストランの客
ウェイター: API
厨房: GitHub のサーバー

1. あなたが「水ください」と頼む（APIリクエスト）
2. ウェイターが厨房に伝える（API経由で通信）
3. 厨房が水を用意する（サーバーがデータを準備）
4. ウェイターが水を持ってくる（APIレスポンス）
```

**実際の例**:
```typescript
// GitHub API に「Gaku52のリポジトリ一覧をください」と頼む
const response = await fetch('https://api.github.com/users/Gaku52/repos')

// GitHub が一覧を返してくれる
const repos = await response.json()
// → [{ name: 'spark-vault', ... }, { name: 'notion-zenn-editor', ... }]
```

#### サーバーレス とは？

**専門的な説明**: サーバーを管理せずにコードを実行する仕組み
**日常的な説明**: 使った分だけ課金される電気みたいなもの

**従来の方法（サーバーあり）**:
```
1. サーバーを借りる（月5,000円）
2. 24時間365日稼働
3. 週1回しか使わなくても5,000円払う
4. サーバーの管理（アップデート等）が必要
```

**サーバーレス（Lambda）**:
```
1. コードだけアップロード
2. 実行されたときだけ課金
3. 週1回 × 30秒 = 月2分だけ稼働 → 無料
4. 管理不要（AWS が全部やってくれる）
```

**例え話**:
- **従来**: マイカーを所有（駐車場代、保険、車検が毎月かかる）
- **サーバーレス**: タクシー（乗ったときだけ課金、維持費ゼロ）

#### トークン とは？

**専門的な説明**: API 認証用の鍵
**日常的な説明**: 建物に入るためのIDカード

**種類**:

**1. GitHub Token**
```
ghp_1234567890abcdefghijklmnopqrstuvwxyz
│└─ GitHub Personal token
└─ 接頭辞（GitHub が発行したトークンだと分かる）

用途: 「私はGaku52です」とGitHubに証明する
```

**2. Claude API Key**
```
sk-ant-1234567890abcdefghijklmnopqrstuvwxyz
│  │└─ ランダムな文字列（秘密にする）
│  └─ Anthropic
└─ Secret Key

用途: 「私はClaude API を使う権利があります」と証明
```

**3. Supabase Key**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
│└─ JWT（JSON Web Token）形式
└─ Base64エンコードされた文字列

用途: 「私はこのSupabaseプロジェクトのオーナーです」と証明
```

**重要**: トークンは **絶対に公開しない**（銀行の暗証番号と同じ）

#### Cron とは？

**専門的な説明**: スケジュール実行の仕組み
**日常的な説明**: スマホのアラーム・リマインダー

**Cron式の読み方**:
```
cron(0 13 ? * SUN *)
     │ │  │ │  │  │
     │ │  │ │  │  └─ 年（*=毎年）
     │ │  │ │  └──── 曜日（SUN=日曜日）
     │ │  │ └─────── 月（*=毎月）
     │ │  └────────── 日（?=指定しない）
     │ └───────────── 時（13=13時=午後1時 UTC）
     └────────────── 分（0=0分）

意味: 毎週日曜日の13:00 UTC（= 22:00 JST）に実行
```

**他の例**:
```
cron(0 0 * * ? *)     → 毎日 午前0時 UTC
cron(0 9 1 * ? *)     → 毎月1日 午前9時 UTC
cron(0 0 ? * MON-FRI *) → 平日 午前0時 UTC
```

**なぜ UTC？**
- UTC = 世界標準時
- JST（日本時間）= UTC + 9時間
- 日本の22:00 = UTC の13:00

#### Lambda の仕組み

**コンセプト**: 関数をクラウドで実行

**手元のパソコンで実行**:
```typescript
// index.ts
async function main() {
  console.log('こんにちは')
}

main()  // ← 自分で実行ボタンを押す
```

**Lambda で実行**:
```typescript
// index.ts
export const handler = async (event) => {
  console.log('こんにちは')
  return { statusCode: 200 }
}

// ← EventBridge が自動で実行してくれる
```

**違い**:
- 手元: 自分が手動で実行
- Lambda: EventBridge が週次で自動実行

---

### この技術スタックで何ができるの？

#### 1週間の流れ

**月曜〜土曜**:
- 普通にコードを書く
- GitHub にコミット・プッシュ
- 何もしなくてOK

**日曜 22:00**:
```
22:00:00  EventBridge が「今だ！」と Lambda を起動
22:00:01  Lambda が GitHub API を呼ぶ
22:00:05  GitHub が今週のコミット一覧を返す
22:00:06  Lambda が Claude API を呼ぶ
22:00:10  Claude が分析結果を返す
22:00:11  Lambda が Supabase に保存
22:00:12  Lambda が Notion API を呼ぶ
22:00:13  Notion にページが作成される
22:00:14  Lambda 終了
```

**月曜朝**:
- Notion を開く
- 週次レポートが自動で投稿されている
- 読んで終わり

---

### データの流れ

```
GitHub
  ├─ spark-vault
  │   └─ コミット: "Add iOS support" (+150行, -30行)
  ├─ notion-zenn-editor
  │   └─ コミット: "Fix typo" (+2行, -2行)
  └─ github-activity-aggregator
      └─ コミット: "Initial commit" (+500行, -0行)

        ↓ GitHub API で取得

Lambda
  ├─ 集計: 3リポジトリ, 3コミット, 合計652行追加
  └─ Claude に送信: "この3つのコミットを分析して"

        ↓ Claude API で分析

AI分析結果
  "今週は主にiOS対応を進めました。
   Capacitorを使用してspark-vaultをモバイル化。
   その他、ドキュメント修正と新規プロジェクト立ち上げ。"

        ↓ Supabase に保存

Database
  weekly_reports テーブル
    ├─ week_start: 2025-11-09
    ├─ week_end: 2025-11-16
    ├─ total_commits: 3
    ├─ summary: "今週は主に..."
    └─ notion_page_url: https://notion.so/xxx

        ↓ Notion API に投稿

Notion
  新規ページ作成
    タイトル: "週次レポート 2025-11-09 〜 2025-11-16"
    内容: AI分析結果 + 統計データ
```

---

### なぜこの技術の組み合わせなの？

#### AWS Lambda を選ぶ理由

**比較対象**: Vercel Cron, GitHub Actions, Railway

| サービス | 無料枠 | 週次実行のコスト | Supabase との相性 |
|---------|-------|---------------|-----------------|
| AWS Lambda | 100万回/月 | 無料 | ◎（同じクラウド） |
| Vercel Cron | 制限あり | 無料だが制約多い | △ |
| GitHub Actions | 2,000分/月 | 無料 | ○ |
| Railway | なし | $5/月〜 | △ |

**結論**: AWS Lambda が最もコスト効率が良く、制約が少ない

#### Supabase を選ぶ理由

**比較対象**: PostgreSQL（自前）, MongoDB Atlas, Firebase

| サービス | 既存契約 | 容量 | 使いやすさ |
|---------|---------|------|----------|
| Supabase Pro | ✅ ある | 100GB | ◎ |
| PostgreSQL | ❌ なし | 自前で管理 | △（面倒） |
| MongoDB Atlas | ❌ なし | 512MB無料 | ○ |
| Firebase | ❌ なし | 1GB無料 | ○ |

**結論**: 既にSupabase Pro契約があるので追加コストゼロ

#### Claude を選ぶ理由

**比較対象**: OpenAI GPT-4o mini, Gemini

| API | 料金（1M tokens） | 日本語品質 | コード理解 |
|-----|----------------|----------|----------|
| Claude Haiku | $0.80 | ◎ | ◎ |
| GPT-4o mini | $0.15 | ○ | ○ |
| Gemini Flash | $0.075 | △ | ○ |

**結論**:
- GPT-4o mini の方が安い（$0.15 vs $0.80）
- でもClaude の方がコミット分析の品質が高い
- コスト差は月3円程度なので品質優先

**実際の選択**:
- 最初は Claude で実装
- コストが気になったら GPT-4o mini に変更可能（コード1行変えるだけ）

---

## 🎯 レベル2: 実践準備（必読）

### 必要なアカウント

すでに持っているもの:
- ✅ GitHub アカウント
- ✅ Supabase Pro 契約
- ✅ Notion アカウント

新規に必要なもの:
- ❌ AWS アカウント
- ❌ Claude API Key（Anthropic アカウント）

---

### AWS アカウントの作り方

#### ステップ1: サインアップ

```
1. https://aws.amazon.com/jp/ にアクセス
2. 「無料で始める」をクリック
3. メールアドレス入力
4. AWS アカウント名を入力（例: gaku-dev）
5. パスワード設定
```

#### ステップ2: 連絡先情報

```
1. アカウントタイプ: 「個人」を選択
2. 氏名、電話番号、住所を入力（日本語OK）
3. 利用規約に同意
```

#### ステップ3: 支払い情報

```
1. クレジットカード情報を入力
2. 請求先住所を入力

注意: カード情報は必須だが、無料枠内なら課金されない
```

#### ステップ4: 本人確認

```
1. 電話番号認証
2. SMSまたは音声通話を選択
3. 4桁の認証コードを入力
```

#### ステップ5: サポートプラン

```
「ベーシックサポート - 無料」を選択

他のプラン（月$29〜）は不要
```

#### ステップ6: 完了

```
「AWS Management Console にサインイン」ボタンが表示される
→ これでアカウント作成完了！
```

**所要時間**: 10-15分

---

### Claude API Key の取得

#### ステップ1: アカウント作成

```
1. https://console.anthropic.com/ にアクセス
2. 「Sign Up」をクリック
3. メールアドレス入力
4. 確認メールが届く
5. メール内のリンクをクリック
6. パスワード設定
```

#### ステップ2: 支払い情報登録

```
1. 「Billing」をクリック
2. クレジットカード情報を入力
3. 最低チャージ額: $5

注意: 前払い制（使った分だけ減る）
```

#### ステップ3: API Key 作成

```
1. 左メニュー「API Keys」をクリック
2. 「Create Key」ボタンをクリック
3. 名前を入力（例: github-activity-aggregator）
4. 「Create Key」をクリック
5. キーが表示される: sk-ant-xxxxxxxxxxxxx

⚠️ 重要: この画面は一度しか表示されないので必ずコピー！
```

**所要時間**: 5分

---

### GitHub Token の取得

```
1. GitHub → Settings
2. 左メニュー最下部「Developer settings」
3. 「Personal access tokens」→「Tokens (classic)」
4. 「Generate new token」→「Generate new token (classic)」
5. Note: github-activity-aggregator
6. Expiration: No expiration（期限なし）
7. スコープ選択:
   ✅ repo（全リポジトリアクセス）
   ✅ read:user
8. 「Generate token」をクリック
9. トークンが表示される: ghp_xxxxxxxxxxxxx

⚠️ 重要: 必ずコピーして保存！
```

**所要時間**: 3分

---

### Notion API の設定（既存）

既に設定済みのはずですが、確認:

```
環境変数:
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx

これが既にあれば追加作業不要
```

---

### 環境変数の整理

すべてのトークンを1箇所にまとめて管理:

```bash
# .env.local（ローカル開発用）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=Gaku52

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxxxxxxxxxx

CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx

NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
```

**保存場所**: パスワード管理ツール（1Password, Bitwarden等）

---

## 🎯 レベル3: 実装（順次実施）

### 学習順序の全体像

```
Step 1: ローカルで GitHub API を叩いてみる（1時間）
  ↓ できたら次へ
Step 2: ローカルで Claude API を試す（1時間）
  ↓ できたら次へ
Step 3: ローカルで Supabase に保存（1時間）
  ↓ できたら次へ
Step 4: ローカルで Notion に投稿（30分）
  ↓ できたら次へ
Step 5: 全部を1つのスクリプトにまとめる（2時間）
  ↓ ローカルで完璧に動いたら次へ
Step 6: Lambda にデプロイ（2時間）
  ↓ Lambda で手動実行できたら次へ
Step 7: EventBridge で週次実行設定（30分）
  ↓ 完成！
```

**重要な考え方**:
- いきなりLambda にデプロイしない
- まずローカルで完璧に動かす
- 1つずつ理解しながら進める

---

### Step 1: GitHub API を試す（1時間）

#### 目標
自分のリポジトリ一覧を取得してコンソールに表示

#### 準備

```bash
# 新規フォルダ作成
mkdir github-activity-test
cd github-activity-test

# Node.js プロジェクト初期化
npm init -y

# TypeScript インストール
npm install -D typescript @types/node tsx

# .env ファイル作成
cat > .env << 'EOF'
GITHUB_TOKEN=あなたのトークン
GITHUB_USERNAME=Gaku52
EOF
```

#### コード作成

```typescript
// test-github.ts
import 'dotenv/config'

async function testGitHub() {
  const token = process.env.GITHUB_TOKEN
  const username = process.env.GITHUB_USERNAME

  console.log('GitHub API テスト開始...\n')

  try {
    // 1. リポジトリ一覧取得
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=10&sort=pushed`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const repos = await response.json()

    console.log(`✅ ${repos.length}個のリポジトリを取得\n`)

    repos.forEach((repo: any, index: number) => {
      console.log(`${index + 1}. ${repo.name}`)
      console.log(`   言語: ${repo.language || '不明'}`)
      console.log(`   スター: ${repo.stargazers_count}`)
      console.log(`   更新: ${new Date(repo.pushed_at).toLocaleString('ja-JP')}`)
      console.log()
    })

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testGitHub()
```

#### 実行

```bash
# dotenv インストール
npm install dotenv

# 実行
npx tsx test-github.ts
```

#### 期待される出力

```
GitHub API テスト開始...

✅ 10個のリポジトリを取得

1. spark-vault
   言語: TypeScript
   スター: 2
   更新: 2025/11/15 23:45:32

2. notion-zenn-editor
   言語: TypeScript
   スター: 0
   更新: 2025/11/14 12:30:15

...
```

#### もしエラーが出たら

**エラー1: `HTTP 401: Unauthorized`**
```
原因: GitHub Token が間違っている
対処: .env の GITHUB_TOKEN を確認
```

**エラー2: `HTTP 404: Not Found`**
```
原因: GITHUB_USERNAME が間違っている
対処: .env の GITHUB_USERNAME を確認（Gaku52）
```

**エラー3: `fetch is not defined`**
```
原因: Node.js のバージョンが古い（18未満）
対処: Node.js 18以上にアップデート
```

#### 成功したら

✅ GitHub API の基本が理解できた
✅ 次のステップ（Claude API）へ進む

---

### Step 2: Claude API を試す（1時間）

#### 目標
コミットメッセージをClaude に送って分析結果を取得

#### 準備

```bash
# Claude SDK インストール
npm install @anthropic-ai/sdk
```

#### .env に追加

```bash
# .env に追加
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
```

#### コード作成

```typescript
// test-claude.ts
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

async function testClaude() {
  const apiKey = process.env.CLAUDE_API_KEY

  console.log('Claude API テスト開始...\n')

  try {
    const anthropic = new Anthropic({ apiKey })

    // テスト用のコミットメッセージ
    const commits = [
      'Add iOS support with Capacitor',
      'Fix typo in README',
      'Update Notion integration'
    ]

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `以下のコミットを分析し、今週の作業内容を3行でまとめてください。

【コミット一覧】
${commits.map((c, i) => `${i + 1}. ${c}`).join('\n')}

【出力形式】
- 簡潔に
- 技術用語を含める
- 3行以内`
      }]
    })

    const analysis = message.content[0].text

    console.log('✅ Claude の分析結果:\n')
    console.log(analysis)
    console.log('\n📊 使用トークン:')
    console.log(`  入力: ${message.usage.input_tokens} tokens`)
    console.log(`  出力: ${message.usage.output_tokens} tokens`)

    // コスト計算
    const inputCost = (message.usage.input_tokens / 1_000_000) * 0.80
    const outputCost = (message.usage.output_tokens / 1_000_000) * 4.00
    const totalCost = inputCost + outputCost

    console.log(`\n💰 コスト: $${totalCost.toFixed(6)} (約${(totalCost * 150).toFixed(2)}円)`)

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testClaude()
```

#### 実行

```bash
npx tsx test-claude.ts
```

#### 期待される出力

```
Claude API テスト開始...

✅ Claude の分析結果:

- Capacitorを使用してiOSサポートを追加
- ドキュメント（README）の誤字修正
- Notion連携機能のアップデート

📊 使用トークン:
  入力: 85 tokens
  出力: 45 tokens

💰 コスト: $0.000248 (約0.04円)
```

#### もしエラーが出たら

**エラー1: `Invalid API Key`**
```
原因: Claude API Key が間違っている
対処: Anthropic Console で再確認
```

**エラー2: `Insufficient credits`**
```
原因: Claude APIの残高が不足
対処: Anthropic Console で$5チャージ
```

#### 成功したら

✅ Claude API の使い方が理解できた
✅ トークン数とコストの計算方法が分かった
✅ 次のステップ（Supabase）へ進む

---

### Step 3以降は次のメッセージで

長くなりすぎたので、ここまでを一度消化してから続きを説明します。

---

## 📝 現時点でのチェックリスト

実装を始める前に、以下を確認:

### アカウント準備
- [ ] AWS アカウント作成
- [ ] Claude API Key 取得（$5チャージ）
- [ ] GitHub Token 取得
- [ ] すべての環境変数をパスワード管理ツールに保存

### 基礎理解
- [ ] API とは何か理解した
- [ ] サーバーレスの概念が分かった
- [ ] トークンの役割が分かった
- [ ] Cron式の読み方が分かった

### 実践準備
- [ ] Node.js 18以上がインストールされている
- [ ] TypeScript の基本が分かる（変数、関数、async/await）
- [ ] ターミナルでコマンド実行ができる

---

## 🤔 よくある質問

### Q1: プログラミング初心者でも大丈夫？

A: TypeScript の基礎（変数、関数、async/await）が分かれば大丈夫です。
ただし、全くの初心者の場合は、先に以下を学習することをおすすめ:
- TypeScript 入門（2-3時間）
- async/await の理解（1時間）

### Q2: 失敗したらお金がかかる？

A: 無料枠内なので大丈夫です。
唯一かかるのは Claude API（$5の前払い）のみ。
週次実行なら月4円程度なので、$5で約1年使えます。

### Q3: エラーが出たらどうする？

A: エラーメッセージをそのまま Claude Code に貼り付けてください。
段階的に進めているので、問題の切り分けが簡単です。

### Q4: どれくらいの時間がかかる？

A:
- アカウント準備: 30分
- Step 1-2（ローカルテスト）: 2-3時間
- Step 3-5（統合）: 3-4時間
- Step 6-7（AWS デプロイ）: 2-3時間
- **合計**: 8-11時間（詰まる箇所を含めて15時間程度）

### Q5: いきなり全部やらないとダメ？

A: いいえ。段階的に進めてOKです。
- 1日目: アカウント準備 + Step 1
- 2日目: Step 2-3
- 3日目: Step 4-5
- 4日目: Step 6-7

---

## 📝 完全版チェックリスト

### アカウント準備
- [ ] AWS アカウント作成完了
- [ ] Claude API Key 取得完了（$5チャージ済み）
- [ ] GitHub Token 取得完了
- [ ] Supabase Pro契約確認（既存）
- [ ] Notion API設定確認（既存）
- [ ] すべての環境変数をパスワード管理ツールに保存

### 基礎理解
- [ ] API とは何か理解した
- [ ] サーバーレスの概念が分かった
- [ ] トークンの役割が分かった
- [ ] Cron式の読み方が分かった
- [ ] Lambda の仕組みが分かった

### 実装完了
- [ ] Step 1: GitHub API テスト成功
- [ ] Step 2: Claude API テスト成功
- [ ] Step 3: Supabase 保存テスト成功
- [ ] Step 4: Notion 投稿テスト成功
- [ ] Step 5: ローカルで全機能統合成功
- [ ] Step 6: Lambda デプロイ・実行成功
- [ ] Step 7: EventBridge 週次設定完了

### 最終確認
- [ ] Lambda で手動実行して Notion にページ作成される
- [ ] EventBridge の次回実行日時が正しい（日曜22:00 JST）
- [ ] すべての環境変数が Lambda に設定されている
- [ ] タイムアウトが60秒に設定されている
- [ ] メモリが512MBに設定されている

---

## 🤔 よくある質問

### Q1: プログラミング初心者でも大丈夫？

A: TypeScript の基礎（変数、関数、async/await）が分かれば大丈夫です。

### Q2: 失敗したらお金がかかる？

A: 無料枠内なので大丈夫です。唯一かかるのは Claude API（$5の前払い）のみ。

### Q3: エラーが出たらどうする？

A: エラーメッセージをそのまま Claude Code に貼り付けてください。

### Q4: どれくらいの時間がかかる？

A: 合計8-11時間（詰まる箇所を含めて15時間程度）

### Q5: weekly_reports テーブルがまだ作成されていない

A: Step 3 で repositories テーブルだけ作りました。weekly_reports テーブルも作成が必要です:

```sql
-- Supabase SQL Editor で実行
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_commits INTEGER DEFAULT 0,
  summary TEXT,
  notion_page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weekly_reports DISABLE ROW LEVEL SECURITY;
```

---

## 🎯 次のステップ

準備ができたら Step 1 から実装を開始してください。

何か質問があれば遠慮なく聞いてください。
