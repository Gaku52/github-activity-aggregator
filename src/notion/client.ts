export interface NotionReport {
  date: string
  total_commits: number
  summary: string
}

export async function postToNotion(
  report: NotionReport
): Promise<{ url: string }> {
  console.log('📤 Notion に投稿中...')

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [{
            text: {
              content: `週次レポート - ${report.date}`
            }
          }]
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
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: `コミット数: ${report.total_commits}` }
            }]
          }
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '📝 サマリー' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: report.summary }
            }]
          }
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Notion API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  console.log(`  ✓ 投稿完了: ${data.url}\n`)

  return { url: data.url }
}
