# 実装計画書 - 明日から始める週次自動化

**作成日**: 2025-11-16
**対象**: 明日から実装を開始する人向け
**目標**: Step-by-Stepで迷わず実装できる

---

## 📋 この設計書の使い方

1. **まずこのファイルを印刷 or 別画面で開く**
2. **チェックボックスに✅を入れながら進める**
3. **各ステップのコードをコピペして実行**
4. **エラーが出たら対処法を確認**
5. **1ステップ完了したら次へ**

---

## 🎯 1日目の目標（所要時間: 3-4時間）

**ゴール**: ローカル環境で全機能が動く状態

```
[ ] アカウント準備完了
[ ] Step 1: GitHub API テスト成功
[ ] Step 2: Claude API テスト成功
[ ] Step 3: Supabase テスト成功
[ ] Step 4: Notion テスト成功
[ ] Step 5: 統合スクリプト完成
```

---

## 📦 事前準備（30分）

### ✅ チェックリスト

```
[ ] Node.js 18以上がインストールされている
[ ] Git がインストールされている
[ ] VS Code など好きなエディタがある
[ ] ターミナルが使える
[ ] GitHub アカウントがある
[ ] Supabase Pro 契約がある
[ ] Notion アカウントがある
```

### Node.js バージョン確認

```bash
node --version
# v18.0.0 以上であればOK
# もし古い場合は https://nodejs.org/ からインストール
```

---

## 🔑 Step 0: アカウント準備（30分）

### 0-1: AWS アカウント作成（15分）

```
[ ] 1. https://aws.amazon.com/jp/ にアクセス
[ ] 2. 「無料で始める」をクリック
[ ] 3. メールアドレス・パスワード設定
[ ] 4. 連絡先情報入力（個人を選択）
[ ] 5. クレジットカード情報入力（無料枠内なら課金なし）
[ ] 6. 電話番号認証（SMS）
[ ] 7. ベーシックサポート（無料）を選択
[ ] 8. 完了

確認: AWS Management Console にログインできる
```

### 0-2: Claude API Key 取得（10分）

```
[ ] 1. https://console.anthropic.com/ にアクセス
[ ] 2. Sign Up（メールアドレス・パスワード）
[ ] 3. 確認メールのリンクをクリック
[ ] 4. Billing → クレジットカード登録
[ ] 5. $5 チャージ（最低額）
[ ] 6. API Keys → Create Key
[ ] 7. 名前: github-activity-aggregator
[ ] 8. キーをコピー: sk-ant-xxxxxxxxxxxxx

⚠️ 重要: キーは二度と表示されないので必ず保存！
```

**保存先**: パスワード管理ツール or メモ帳

### 0-3: GitHub Token 取得（5分）

```
[ ] 1. GitHub → Settings
[ ] 2. Developer settings（左メニュー最下部）
[ ] 3. Personal access tokens → Tokens (classic)
[ ] 4. Generate new token (classic)
[ ] 5. Note: github-activity-aggregator
[ ] 6. Expiration: No expiration
[ ] 7. スコープ:
      ✅ repo
      ✅ read:user
[ ] 8. Generate token
[ ] 9. トークンをコピー: ghp_xxxxxxxxxxxxx

⚠️ 重要: 必ず保存！
```

### 0-4: 環境変数ファイル準備

すべてのトークンを1箇所にまとめます。

**~/.github-activity-env.txt を作成**:

```bash
# ホームディレクトリに保存（gitに入らない場所）
cat > ~/.github-activity-env.txt << 'EOF'
# GitHub
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx（あなたのトークンに置き換え）
GITHUB_USERNAME=Gaku52

# Supabase（既存の値）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxxxxxxxxxxxx

# Claude API
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx（あなたのキーに置き換え）

# Notion（既存の値）
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
EOF
```

**確認**:
```bash
cat ~/.github-activity-env.txt
# すべての値が正しく入力されているか確認
```

---

## 🚀 Step 1: GitHub API テスト（30分）

### 1-1: テストプロジェクト作成

```bash
# 作業ディレクトリに移動
cd ~/github-activity-aggregator

# または新規作成
mkdir -p ~/github-activity-test
cd ~/github-activity-test

# Node.js プロジェクト初期化
npm init -y

# 必要なパッケージインストール
npm install dotenv
npm install -D typescript @types/node tsx
```

### 1-2: .env ファイル作成

```bash
# プロジェクトルートに .env 作成
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=Gaku52
EOF

# ⚠️ 実際のトークンに置き換えてください
```

### 1-3: テストコード作成

**test-github.ts**:

```bash
cat > test-github.ts << 'EOF'
import 'dotenv/config'

async function testGitHub() {
  const token = process.env.GITHUB_TOKEN
  const username = process.env.GITHUB_USERNAME

  console.log('🔍 GitHub API テスト開始...\n')

  try {
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
EOF
```

### 1-4: 実行

```bash
npx tsx test-github.ts
```

### 1-5: 期待される結果

```
🔍 GitHub API テスト開始...

✅ 10個のリポジトリを取得

1. spark-vault
   言語: TypeScript
   スター: 2
   更新: 2025/11/15 23:45:32

2. notion-zenn-editor
   ...
```

### 1-6: エラー対処

**エラー: `HTTP 401: Unauthorized`**
```
原因: GITHUB_TOKEN が間違っている
対処: .env の GITHUB_TOKEN を再確認
```

**エラー: `fetch is not defined`**
```
原因: Node.js が古い
対処: Node.js 18以上にアップデート
```

### ✅ Step 1 完了チェック

```
[ ] リポジトリ一覧が表示された
[ ] エラーなく実行できた
```

---

## 🤖 Step 2: Claude API テスト（30分）

### 2-1: パッケージ追加

```bash
npm install @anthropic-ai/sdk
```

### 2-2: .env に追加

```bash
# .env に追加（既存の内容は残す）
echo "CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx" >> .env

# ⚠️ 実際のキーに置き換えてください
```

### 2-3: テストコード作成

**test-claude.ts**:

```bash
cat > test-claude.ts << 'EOF'
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

async function testClaude() {
  const apiKey = process.env.CLAUDE_API_KEY

  console.log('🤖 Claude API テスト開始...\n')

  try {
    const anthropic = new Anthropic({ apiKey })

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

    const inputCost = (message.usage.input_tokens / 1_000_000) * 0.80
    const outputCost = (message.usage.output_tokens / 1_000_000) * 4.00
    const totalCost = inputCost + outputCost

    console.log(`\n💰 コスト: $${totalCost.toFixed(6)} (約${(totalCost * 150).toFixed(2)}円)`)

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testClaude()
EOF
```

### 2-4: 実行

```bash
npx tsx test-claude.ts
```

### 2-5: 期待される結果

```
🤖 Claude API テスト開始...

✅ Claude の分析結果:

- Capacitorを使用してiOSサポートを追加
- ドキュメント（README）の誤字修正
- Notion連携機能のアップデート

📊 使用トークン:
  入力: 85 tokens
  出力: 45 tokens

💰 コスト: $0.000248 (約0.04円)
```

### 2-6: エラー対処

**エラー: `Invalid API Key`**
```
原因: CLAUDE_API_KEY が間違っている
対処: .env の CLAUDE_API_KEY を再確認
```

**エラー: `Insufficient credits`**
```
原因: チャージ不足
対処: Anthropic Console で$5チャージ
```

### ✅ Step 2 完了チェック

```
[ ] Claude の分析結果が表示された
[ ] コスト計算が表示された
```

---

## 🗄️ Step 3: Supabase テスト（1時間）

### 3-1: Supabase テーブル作成

```
[ ] 1. https://supabase.com/dashboard にログイン
[ ] 2. プロジェクトを選択
[ ] 3. 左メニュー「SQL Editor」
[ ] 4. 「New query」
[ ] 5. 以下のSQLを貼り付けて実行
```

**SQL**:

```sql
-- リポジトリマスタ
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  description TEXT,
  language TEXT,
  stars INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 週次レポート
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_commits INTEGER DEFAULT 0,
  summary TEXT,
  notion_page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS無効化
ALTER TABLE repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports DISABLE ROW LEVEL SECURITY;
```

```
[ ] 6. 「Run」をクリック
[ ] 7. 「Success. No rows returned」を確認
```

### 3-2: Supabase 接続情報取得

```
[ ] 1. 左メニュー「Settings」→「API」
[ ] 2. Project URL をコピー: https://xxxxx.supabase.co
[ ] 3. anon public key をコピー: eyJxxxxx...
```

### 3-3: .env に追加

```bash
# .env に追加
cat >> .env << 'EOF'
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxxxxxxxxxxxx
EOF

# ⚠️ 実際の値に置き換えてください
```

### 3-4: パッケージ追加

```bash
npm install @supabase/supabase-js
```

### 3-5: テストコード作成

**test-supabase.ts**:

```bash
cat > test-supabase.ts << 'EOF'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function testSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_KEY!

  console.log('🗄️  Supabase テスト開始...\n')

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const testRepo = {
      name: 'test-repo',
      full_name: 'Gaku52/test-repo',
      description: 'テスト用リポジトリ',
      language: 'TypeScript',
      stars: 0,
      is_private: false
    }

    console.log('📝 データ挿入中...')
    const { data: insertedData, error: insertError } = await supabase
      .from('repositories')
      .insert(testRepo)
      .select()

    if (insertError) throw insertError

    console.log('✅ 挿入成功:', insertedData[0].id)

    console.log('\n📖 データ取得中...')
    const { data: repos, error: selectError } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (selectError) throw selectError

    console.log(`✅ ${repos.length}件取得\n`)
    repos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}`)
      console.log(`   言語: ${repo.language}`)
      console.log(`   作成: ${new Date(repo.created_at).toLocaleString('ja-JP')}`)
      console.log()
    })

    console.log('🗑️  テストデータ削除中...')
    const { error: deleteError } = await supabase
      .from('repositories')
      .delete()
      .eq('name', 'test-repo')

    if (deleteError) throw deleteError

    console.log('✅ 削除完了')

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testSupabase()
EOF
```

### 3-6: 実行

```bash
npx tsx test-supabase.ts
```

### 3-7: 期待される結果

```
🗄️  Supabase テスト開始...

📝 データ挿入中...
✅ 挿入成功: 123e4567-e89b-12d3-a456-426614174000

📖 データ取得中...
✅ 1件取得

1. Gaku52/test-repo
   言語: TypeScript
   作成: 2025/11/16 10:30:45

🗑️  テストデータ削除中...
✅ 削除完了
```

### 3-8: エラー対処

**エラー: `Invalid API key`**
```
原因: SUPABASE_KEY が間違っている
対処: Supabase Dashboard → Settings → API で再確認
```

**エラー: `relation "repositories" does not exist`**
```
原因: テーブルが作成されていない
対処: SQL Editor でテーブル作成SQLを再実行
```

### ✅ Step 3 完了チェック

```
[ ] データ挿入成功
[ ] データ取得成功
[ ] データ削除成功
```

---

## 📤 Step 4: Notion テスト（30分）

### 4-1: .env に追加（既存の値を使用）

```bash
# .env に追加
cat >> .env << 'EOF'
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
EOF

# ⚠️ 既存の値を使用してください
```

### 4-2: テストコード作成

**test-notion.ts**:

```bash
cat > test-notion.ts << 'EOF'
import 'dotenv/config'

async function testNotion() {
  const notionApiKey = process.env.NOTION_API_KEY!
  const notionDatabaseId = process.env.NOTION_DATABASE_ID!

  console.log('📤 Notion API テスト開始...\n')

  try {
    const testReport = {
      date: new Date().toISOString().split('T')[0],
      total_commits: 5,
      summary: 'テスト投稿：週次レポート自動化の実装中'
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: notionDatabaseId },
        properties: {
          Name: {
            title: [{ text: { content: `週次レポート（テスト） - ${testReport.date}` } }]
          }
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: '📊 今週の活動' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: testReport.summary } }]
            }
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(JSON.stringify(error, null, 2))
    }

    const data = await response.json()
    console.log('✅ Notion 投稿成功！')
    console.log(`📄 ページURL: ${data.url}`)

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

testNotion()
EOF
```

### 4-3: 実行

```bash
npx tsx test-notion.ts
```

### 4-4: 期待される結果

```
📤 Notion API テスト開始...

✅ Notion 投稿成功！
📄 ページURL: https://www.notion.so/xxxxx
```

### 4-5: Notion で確認

```
[ ] Notion を開く
[ ] データベースに新規ページが追加されている
[ ] 内容が正しく表示されている
```

### ✅ Step 4 完了チェック

```
[ ] Notion に投稿成功
[ ] ページURLが表示された
```

---

## 🔗 Step 5: 全機能統合（2-3時間）

ここからは本格的な実装に入ります。
明日の1日目はここまでで終了でもOKです。

### 5-1: プロジェクト構成作成

```bash
# github-activity-aggregatorに移動
cd ~/github-activity-aggregator

# フォルダ構成作成
mkdir -p src/{github,claude,supabase,notion}

# package.json 作成（既にある場合はスキップ）
npm init -y

# 依存関係インストール
npm install dotenv @supabase/supabase-js @anthropic-ai/sdk
npm install -D typescript @types/node tsx @types/aws-lambda
```

### 5-2: tsconfig.json 作成

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

### 5-3: .env作成（全環境変数をまとめる）

```bash
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_USERNAME=Gaku52
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxxxxxxxxxxxx
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
EOF

# ⚠️ すべて実際の値に置き換えてください
```

### 5-4: .gitignore 作成

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
EOF
```

---

## ⏸️ 1日目はここまでで終了を推奨

**ここまでの達成事項**:

```
✅ AWS/Claude API アカウント作成
✅ GitHub API で自分のリポジトリ取得成功
✅ Claude API でコミット分析成功
✅ Supabase にデータ保存成功
✅ Notion に投稿成功
✅ プロジェクト構成完成
```

**所要時間**: 3-4時間

**次回（2日目）やること**:
- Step 5の続き（統合スクリプト作成）
- Step 6（Lambda デプロイ）
- Step 7（EventBridge 設定）

---

## 📝 1日目終了チェックリスト

```
[ ] すべてのアカウントが作成された
[ ] すべての環境変数が .env に保存された
[ ] test-github.ts が成功
[ ] test-claude.ts が成功
[ ] test-supabase.ts が成功
[ ] test-notion.ts が成功
[ ] プロジェクト構成が作成された
```

**すべてチェックがついたら1日目完了！お疲れ様でした。**

---

## 🔄 2日目の予告

次回は以下を実装します:

1. **src/github/client.ts** - GitHub データ取得
2. **src/claude/analyzer.ts** - Claude 分析
3. **src/supabase/client.ts** - Supabase 保存
4. **src/notion/client.ts** - Notion 投稿
5. **src/index.ts** - メイン処理
6. **Lambda デプロイ**
7. **EventBridge 設定**

2日目の詳細は `IMPLEMENTATION_DAY2.md` を参照してください（次に作成します）。
