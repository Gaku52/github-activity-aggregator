import * as dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config();

async function testNotionDetailed() {
  console.log('='.repeat(60));
  console.log('Notion API 詳細テスト');
  console.log('='.repeat(60));

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  console.log('\n📋 設定情報:');
  console.log('  API Key (先頭20文字):', apiKey?.substring(0, 20) + '...');
  console.log('  Database ID:', databaseId);
  console.log('  Database URL: https://www.notion.so/' + databaseId?.replace(/-/g, ''));

  if (!apiKey || !databaseId) {
    console.log('\n❌ エラー: API KeyまたはDatabase IDが設定されていません');
    return;
  }

  const notion = new Client({ auth: apiKey });

  console.log('\n🔍 Test 1: データベースの取得');
  try {
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    console.log('  ✅ データベース取得成功！');
    console.log('  タイトル:', (database as any).title?.[0]?.plain_text || '(タイトルなし)');
    console.log('  プロパティ数:', Object.keys((database as any).properties || {}).length);
  } catch (error: any) {
    console.log('  ❌ エラー:', error.code);
    console.log('  メッセージ:', error.message);

    if (error.code === 'object_not_found') {
      console.log('\n💡 解決方法:');
      console.log('  1. 以下のURLでデータベースを開く:');
      console.log('     https://www.notion.so/' + databaseId.replace(/-/g, ''));
      console.log('  2. 右上の「...」メニューから「コネクト」を選択');
      console.log('  3. インテグレーションを追加');
      console.log('  4. このスクリプトを再実行');
      console.log('\n  詳細は NOTION_SETUP.md を参照してください。');
    }
    return;
  }

  console.log('\n🔍 Test 2: データベースのクエリ (最初の1件)');
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    });

    console.log('  ✅ クエリ成功！');
    console.log('  取得件数:', response.results.length);

    if (response.results.length > 0) {
      console.log('  最初のページID:', response.results[0].id);
    } else {
      console.log('  (データベースは空です)');
    }
  } catch (error: any) {
    console.log('  ❌ エラー:', error.code);
    console.log('  メッセージ:', error.message);
    return;
  }

  console.log('\n🔍 Test 3: 新しいページの作成（テスト）');
  try {
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: 'API接続テスト - ' + new Date().toISOString(),
              },
            },
          ],
        },
      },
    });

    console.log('  ✅ ページ作成成功！');
    console.log('  ページID:', response.id);
    console.log('  ページURL:', response.url);
  } catch (error: any) {
    console.log('  ❌ エラー:', error.code);
    console.log('  メッセージ:', error.message);

    if (error.code === 'validation_error') {
      console.log('\n💡 ヒント: プロパティ名が一致しない可能性があります。');
      console.log('  データベースのプロパティ設定を確認してください。');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('テスト完了');
  console.log('='.repeat(60));
}

testNotionDetailed();
