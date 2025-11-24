// Notion API 直接テスト
require('dotenv').config({ path: '../../.env' });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log('=== Notion 直接接続テスト ===\n');
console.log('API Key:', NOTION_API_KEY ? NOTION_API_KEY.substring(0, 15) + '...' : 'NOT SET');
console.log('Database ID:', NOTION_DATABASE_ID);
console.log('');

// Test 1: Database取得
async function testDatabaseRetrieval() {
  console.log('Test 1: データベース取得テスト');

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    console.log('  Status:', response.status);

    const data = await response.json();

    if (response.ok) {
      console.log('  ✅ 成功！');
      console.log('  Title:', data.title?.[0]?.plain_text || 'Untitled');
      console.log('  Properties:', Object.keys(data.properties || {}).join(', '));
      return true;
    } else {
      console.log('  ❌ 失敗');
      console.log('  Error:', data);
      return false;
    }
  } catch (error) {
    console.log('  ❌ エラー:', error.message);
    return false;
  }
}

// Test 2: ページ作成テスト
async function testPageCreation() {
  console.log('\nTest 2: ページ作成テスト');

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: {
          database_id: NOTION_DATABASE_ID,
        },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: 'Test Report - ' + new Date().toISOString(),
                },
              },
            ],
          },
        },
      }),
    });

    console.log('  Status:', response.status);

    const data = await response.json();

    if (response.ok) {
      console.log('  ✅ 成功！');
      console.log('  Page ID:', data.id);
      console.log('  URL:', data.url);
      return true;
    } else {
      console.log('  ❌ 失敗');
      console.log('  Error:', data);
      return false;
    }
  } catch (error) {
    console.log('  ❌ エラー:', error.message);
    return false;
  }
}

// 実行
(async () => {
  const test1Success = await testDatabaseRetrieval();

  if (test1Success) {
    await testPageCreation();
  }
})();
