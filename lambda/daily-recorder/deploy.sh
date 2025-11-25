#!/bin/bash

# Daily Recorder Lambda デプロイスクリプト

set -e

FUNCTION_NAME="github-daily-recorder"
REGION="ap-northeast-1"
ROLE_NAME="LambdaDailyRecorderRole"

echo "🚀 Daily Recorder Lambda デプロイ開始..."

# 1. 依存関係のインストール
echo "📦 Step 1: 依存関係をインストール中..."
npm install

# 2. TypeScriptビルド
echo "🔨 Step 2: TypeScriptをビルド中..."
npm run build

# 3. node_modulesをdistにコピー
echo "📋 Step 3: 依存関係をコピー中..."
cp -r node_modules dist/

# 4. zipファイル作成
echo "📦 Step 4: デプロイパッケージを作成中..."
cd dist
zip -r ../daily-recorder.zip . -x "*.ts" -x "*.map"
cd ..

echo "✅ デプロイパッケージ作成完了: daily-recorder.zip"
echo "   サイズ: $(du -h daily-recorder.zip | cut -f1)"

# 5. Lambda関数が存在するか確認
echo "🔍 Step 5: Lambda関数の存在を確認中..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  # 既存の関数を更新
  echo "🔄 既存の関数を更新中..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://daily-recorder.zip \
    --region $REGION

  echo "✅ Lambda関数の更新完了"
else
  # 新規作成
  echo "📝 新しいLambda関数を作成します"
  echo "⚠️  事前にIAMロール '$ROLE_NAME' を作成してください"
  echo ""
  echo "次のコマンドで作成できます:"
  echo "  aws lambda create-function \\"
  echo "    --function-name $FUNCTION_NAME \\"
  echo "    --runtime nodejs20.x \\"
  echo "    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/$ROLE_NAME \\"
  echo "    --handler index.handler \\"
  echo "    --zip-file fileb://daily-recorder.zip \\"
  echo "    --timeout 300 \\"
  echo "    --memory-size 512 \\"
  echo "    --region $REGION"
  echo ""
  echo "環境変数の設定も忘れずに！"
fi

echo ""
echo "🎉 デプロイ完了！"
echo ""
echo "次のステップ:"
echo "  1. Lambda関数の環境変数を設定"
echo "  2. EventBridge（CloudWatch Events）でスケジュール設定"
echo "  3. テスト実行"
