// 作成されたNotionページの内容を確認
require('dotenv').config({ path: '../../.env' });

const PAGE_ID = '2b5a438d-9c2d-8110-b044-e2cfe77f71cd';
const NOTION_API_KEY = process.env.NOTION_API_KEY;

async function checkPage() {
  console.log('📄 Notionページの内容を確認中...\n');

  // ページ情報取得
  const pageResponse = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
    },
  });

  const pageData = await pageResponse.json();
  console.log('Page Properties:');
  console.log('  Title:', pageData.properties?.Name?.title?.[0]?.plain_text);
  console.log('  日付:', pageData.properties?.['日付']?.date);
  console.log('  カテゴリ:', pageData.properties?.['カテゴリ']?.multi_select?.map(c => c.name));
  console.log('  ステータス:', pageData.properties?.['ステータス']?.select?.name);

  // ブロック（本文）取得
  const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${PAGE_ID}/children`, {
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
    },
  });

  const blocksData = await blocksResponse.json();
  console.log('\nPage Blocks (本文):');
  console.log('  Total blocks:', blocksData.results?.length || 0);

  if (blocksData.results && blocksData.results.length > 0) {
    console.log('  ✅ コンテンツあり');
    console.log('\n  最初の3ブロック:');
    blocksData.results.slice(0, 3).forEach((block, i) => {
      console.log(`  ${i + 1}. Type: ${block.type}`);
      if (block[block.type]?.rich_text) {
        const text = block[block.type].rich_text.map(t => t.plain_text).join('');
        console.log(`     Text: ${text}`);
      }
    });
  } else {
    console.log('  ❌ コンテンツなし（タイトルのみ）');
  }
}

checkPage().catch(console.error);
