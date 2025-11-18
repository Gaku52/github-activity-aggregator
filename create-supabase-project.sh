#!/bin/bash
# ================================================
# Supabase プロジェクト作成スクリプト
# ================================================
# 使い方:
#   1. .env ファイルにパスワードを設定
#   2. chmod +x create-supabase-project.sh
#   3. ./create-supabase-project.sh
# ================================================

set -e

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Supabase プロジェクト作成${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# .envファイル確認
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env ファイルが見つかりません${NC}"
    echo ""
    echo "以下のコマンドで作成してください:"
    echo "  cp .env.example .env"
    echo "  vim .env  # パスワードを設定"
    exit 1
fi

# .envから環境変数読込
echo -e "${YELLOW}📋 環境変数読込中...${NC}"
source .env

# パスワード確認
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${RED}❌ SUPABASE_DB_PASSWORD が設定されていません${NC}"
    echo ""
    echo ".env ファイルを開いて以下を設定してください:"
    echo "  SUPABASE_DB_PASSWORD=YourStrongPassword123!"
    echo ""
    exit 1
fi

# パスワード強度チェック
PASSWORD_LENGTH=${#SUPABASE_DB_PASSWORD}
if [ $PASSWORD_LENGTH -lt 12 ]; then
    echo -e "${RED}❌ パスワードは12文字以上必要です（現在: ${PASSWORD_LENGTH}文字）${NC}"
    exit 1
fi

echo -e "${GREEN}✅ パスワード設定確認完了（${PASSWORD_LENGTH}文字）${NC}"
echo ""

# Organization ID
ORG_ID="bepsfxlmxnjvnpwthrhq"

# プロジェクト作成
echo -e "${YELLOW}🏗️  Supabaseプロジェクト作成中...${NC}"
echo "  プロジェクト名: github-activity-aggregator"
echo "  リージョン: ap-northeast-1 (Tokyo)"
echo ""

# プロジェクト作成実行
OUTPUT=$(supabase projects create github-activity-aggregator \
  --org-id "$ORG_ID" \
  --db-password "$SUPABASE_DB_PASSWORD" \
  --region ap-northeast-1 2>&1)

echo "$OUTPUT"

# Project ID抽出
PROJECT_REF=$(echo "$OUTPUT" | grep -oE '[a-z]{20}' | head -1)

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ プロジェクト作成に失敗しました${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ プロジェクト作成成功！${NC}"
echo -e "   Project Ref: ${YELLOW}$PROJECT_REF${NC}"
echo ""

# プロジェクトにリンク
echo -e "${YELLOW}🔗 プロジェクトにリンク中...${NC}"
supabase link --project-ref "$PROJECT_REF"

echo -e "${GREEN}✅ リンク完了${NC}"
echo ""

# APIキー取得
echo -e "${YELLOW}🔐 APIキー取得中...${NC}"
API_KEYS=$(supabase projects api-keys --project-ref "$PROJECT_REF")

ANON_KEY=$(echo "$API_KEYS" | grep "anon key:" | awk '{print $3}')
SERVICE_KEY=$(echo "$API_KEYS" | grep "service_role key:" | awk '{print $3}')

# .env更新
echo -e "${YELLOW}📝 .env ファイル更新中...${NC}"

# 一時ファイルに書き込み
cat > .env.tmp <<EOF
# ================================================
# GitHub Activity Aggregator - 環境変数
# ================================================
# ⚠️ このファイルは絶対にGitにコミットしないこと！
# ================================================

# Supabase Database Password
SUPABASE_DB_PASSWORD=$SUPABASE_DB_PASSWORD

# Supabase Connection Info（自動入力完了）
SUPABASE_URL=https://${PROJECT_REF}.supabase.co
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_KEY

# GitHub API（後で設定）
GITHUB_TOKEN=${GITHUB_TOKEN:-}
GITHUB_USERNAME=Gaku52

# Notion API（後で設定）
NOTION_API_KEY=${NOTION_API_KEY:-}
NOTION_DATABASE_ID=${NOTION_DATABASE_ID:-}

# Slack Webhook（後で設定）
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
EOF

mv .env.tmp .env

echo -e "${GREEN}✅ .env ファイル更新完了${NC}"
echo ""

# スキーマ適用準備
echo -e "${YELLOW}📊 データベーススキーマ準備中...${NC}"
mkdir -p supabase/migrations
cp supabase/schema.sql supabase/migrations/20251117000000_initial_schema.sql

echo -e "${GREEN}✅ マイグレーションファイル作成完了${NC}"
echo ""

# スキーマ適用
echo -e "${YELLOW}🗄️  データベーススキーマ適用中...${NC}"
supabase db push

echo -e "${GREEN}✅ スキーマ適用完了${NC}"
echo ""

# 完了メッセージ
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 セットアップ完了！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 作成されたリソース:${NC}"
echo -e "  プロジェクト名: ${YELLOW}github-activity-aggregator${NC}"
echo -e "  Project Ref:    ${YELLOW}$PROJECT_REF${NC}"
echo -e "  リージョン:     ${YELLOW}ap-northeast-1 (Tokyo)${NC}"
echo ""
echo -e "${BLUE}🌐 アクセス情報:${NC}"
echo -e "  Dashboard: ${YELLOW}https://supabase.com/dashboard/project/$PROJECT_REF${NC}"
echo -e "  API URL:   ${YELLOW}https://${PROJECT_REF}.supabase.co${NC}"
echo ""
echo -e "${BLUE}📊 作成されたテーブル:${NC}"
echo -e "  ✅ repositories"
echo -e "  ✅ commits"
echo -e "  ✅ weekly_activities"
echo -e "  ✅ generated_reports"
echo -e "  ✅ platform_stats"
echo ""
echo -e "${BLUE}📝 次のステップ:${NC}"
echo -e "  1. ブラウザでダッシュボード確認:"
echo -e "     ${YELLOW}open https://supabase.com/dashboard/project/$PROJECT_REF${NC}"
echo ""
echo -e "  2. GitHub APIトークン取得:"
echo -e "     ${YELLOW}https://github.com/settings/tokens${NC}"
echo -e "     → .env の GITHUB_TOKEN に設定"
echo ""
echo -e "  3. Lambda関数実装開始（Phase 2）"
echo ""
