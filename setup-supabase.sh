#!/bin/bash
# ================================================
# Supabase 完全自動セットアップスクリプト
# ================================================
# 使い方:
#   chmod +x setup-supabase.sh
#   ./setup-supabase.sh
# ================================================

set -e  # エラーで即座に停止

# 色付き出力
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Supabase完全自動セットアップ開始...${NC}"
echo ""

# ================================================
# Step 0: 前提条件チェック
# ================================================
echo -e "${YELLOW}📋 Step 0: 前提条件チェック${NC}"

# Supabase CLI確認
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLIがインストールされていません${NC}"
    echo "インストール方法:"
    echo "  brew install supabase/tap/supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI: $(supabase --version | head -1)${NC}"

# Docker確認
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Dockerがインストールされていません${NC}"
    echo "Docker Desktopをインストールしてください:"
    echo "  https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"

# Docker起動確認
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Dockerが起動していません${NC}"
    echo "Docker Desktopを起動してください"
    exit 1
fi
echo -e "${GREEN}✅ Docker起動中${NC}"

echo ""

# ================================================
# Step 1: プロジェクト初期化
# ================================================
echo -e "${YELLOW}📦 Step 1: Supabaseプロジェクト初期化${NC}"

if [ -f "supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  既にsupabase/config.tomlが存在します${NC}"
    read -p "再初期化しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf supabase/.temp
        supabase init
    else
        echo "スキップしました"
    fi
else
    supabase init
    echo -e "${GREEN}✅ プロジェクト初期化完了${NC}"
fi

echo ""

# ================================================
# Step 2: スキーマ準備
# ================================================
echo -e "${YELLOW}📝 Step 2: データベーススキーマ準備${NC}"

# マイグレーションディレクトリ作成
mkdir -p supabase/migrations

# schema.sqlが存在する場合、マイグレーションに変換
if [ -f "supabase/schema.sql" ]; then
    MIGRATION_FILE="supabase/migrations/20251117000000_initial_schema.sql"

    if [ -f "$MIGRATION_FILE" ]; then
        echo -e "${YELLOW}⚠️  既にマイグレーションファイルが存在します: $MIGRATION_FILE${NC}"
    else
        cp supabase/schema.sql "$MIGRATION_FILE"
        echo -e "${GREEN}✅ スキーマをマイグレーションに変換: $MIGRATION_FILE${NC}"
    fi
else
    echo -e "${RED}❌ supabase/schema.sql が見つかりません${NC}"
    exit 1
fi

echo ""

# ================================================
# Step 3: ローカルSupabase起動
# ================================================
echo -e "${YELLOW}🐳 Step 3: ローカルSupabase起動${NC}"
echo "（初回は数分かかる場合があります...）"

# 既に起動している場合はスキップ
if supabase status &> /dev/null; then
    echo -e "${YELLOW}⚠️  既にSupabaseが起動しています${NC}"
    read -p "再起動しますか？ (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase stop
        supabase start
    fi
else
    supabase start
fi

echo -e "${GREEN}✅ ローカルSupabase起動完了${NC}"
echo ""

# ================================================
# Step 4: スキーマ適用
# ================================================
echo -e "${YELLOW}🗄️  Step 4: データベーススキーマ適用${NC}"

supabase db reset

echo -e "${GREEN}✅ スキーマ適用完了${NC}"
echo ""

# ================================================
# Step 5: 接続情報表示
# ================================================
echo -e "${YELLOW}🔐 Step 5: 接続情報取得${NC}"

# ステータス取得
STATUS_OUTPUT=$(supabase status)

# 接続情報抽出
API_URL=$(echo "$STATUS_OUTPUT" | grep "API URL:" | awk '{print $3}')
DB_URL=$(echo "$STATUS_OUTPUT" | grep "DB URL:" | awk '{print $3}')
STUDIO_URL=$(echo "$STATUS_OUTPUT" | grep "Studio URL:" | awk '{print $3}')
ANON_KEY=$(echo "$STATUS_OUTPUT" | grep "anon key:" | awk '{print $3}')
SERVICE_KEY=$(echo "$STATUS_OUTPUT" | grep "service_role key:" | awk '{print $3}')

# .envファイル生成
cat > .env.local <<EOF
# ================================================
# Supabase ローカル開発環境
# ================================================
# 自動生成日: $(date)
# ================================================

# Supabase接続情報
SUPABASE_URL=$API_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_KEY

# Database直接接続（開発用）
DATABASE_URL=$DB_URL

# Studio URL
STUDIO_URL=$STUDIO_URL
EOF

echo -e "${GREEN}✅ .env.local ファイルを生成しました${NC}"
echo ""

# ================================================
# Step 6: 動作確認
# ================================================
echo -e "${YELLOW}✅ Step 6: 動作確認${NC}"

# テーブル一覧取得
echo "作成されたテーブル:"
psql "$DB_URL" -c "\dt" -t | grep -v "^$" | awk '{print "  - " $3}'

echo ""

# ================================================
# 完了メッセージ
# ================================================
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Supabaseセットアップ完了！${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 接続情報:${NC}"
echo -e "  Studio URL: ${YELLOW}$STUDIO_URL${NC}"
echo -e "  API URL:    ${YELLOW}$API_URL${NC}"
echo -e "  DB URL:     ${YELLOW}$DB_URL${NC}"
echo ""
echo -e "${BLUE}📝 次のステップ:${NC}"
echo -e "  1. Studioを開く:"
echo -e "     ${YELLOW}open $STUDIO_URL${NC}"
echo ""
echo -e "  2. テーブル確認:"
echo -e "     ${YELLOW}psql $DB_URL -c 'SELECT * FROM repositories;'${NC}"
echo ""
echo -e "  3. 環境変数を読み込む:"
echo -e "     ${YELLOW}source .env.local${NC}"
echo ""
echo -e "  4. 本番環境作成（オプション）:"
echo -e "     ${YELLOW}supabase login${NC}"
echo -e "     ${YELLOW}supabase projects create github-activity-aggregator${NC}"
echo ""
echo -e "${BLUE}🛠️  便利なコマンド:${NC}"
echo -e "  - ステータス確認:  ${YELLOW}supabase status${NC}"
echo -e "  - ログ表示:        ${YELLOW}supabase logs${NC}"
echo -e "  - 停止:            ${YELLOW}supabase stop${NC}"
echo -e "  - 再起動:          ${YELLOW}supabase db reset${NC}"
echo ""
