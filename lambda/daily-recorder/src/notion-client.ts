export interface NotionReport {
  date: string
  total_commits: number
  summary: string
}

export interface DailyNotionReport {
  date: string
  total_commits: number
  summary: string
  tokens: number
  cost: number
  workingHours: number
  status: string
  categories: string[]
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

  const data = await response.json() as any
  console.log(`  ✓ 投稿完了: ${data.url}\n`)

  return { url: data.url }
}

function getMonthlyPageTitle(date: string): string {
  // date形式: "2025-11-24" -> "2025-11 日次記録"
  // 年月を抽出して月別ページタイトルを生成
  const [year, month] = date.split('-')
  return `${year}-${month} 日次記録`
}

async function findDailyRecordPage(pageTitle: string): Promise<string | null> {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Name',
          title: {
            equals: pageTitle
          }
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Notion query error: ${JSON.stringify(error)}`)
  }

  const data = await response.json() as any
  return data.results.length > 0 ? data.results[0].id : null
}

async function createDailyRecordPage(pageTitle: string, report: DailyNotionReport): Promise<{ id: string; url: string }> {
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
              content: pageTitle
            }
          }]
        },
        '日付': {
          date: {
            start: report.date
          }
        },
        'カテゴリ': {
          multi_select: report.categories.map(cat => ({ name: cat }))
        },
        'ステータス': {
          select: {
            name: report.status
          }
        },
        '所要時間': {
          number: report.workingHours
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: '📚 日次学習記録' } }]
          }
        },
        {
          object: 'block',
          type: 'divider',
          divider: {}
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Notion create page error: ${JSON.stringify(error)}`)
  }

  const data = await response.json() as any
  return { id: data.id, url: data.url }
}

async function updatePageProperties(pageId: string, report: DailyNotionReport): Promise<void> {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        '日付': {
          date: {
            start: report.date
          }
        },
        'カテゴリ': {
          multi_select: report.categories.map(cat => ({ name: cat }))
        },
        'ステータス': {
          select: {
            name: report.status
          }
        },
        '所要時間': {
          number: report.workingHours
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Notion update properties error: ${JSON.stringify(error)}`)
  }
}

async function appendToPage(pageId: string, report: DailyNotionReport): Promise<void> {
  console.log(`  📝 ページに追記中: ${report.date}`)

  // summary を箇条書きに分割
  const summaryLines = report.summary
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.trim().substring(1).trim())

  const blocks: any[] = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: `${report.date} | ${report.status} | ${report.workingHours}h` }
        }]
      }
    }
  ]

  // 箇条書きを追加
  summaryLines.forEach(line => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: { content: line }
        }]
      }
    })
  })

  // 統計情報を追加
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: {
          content: `📊 コミット: ${report.total_commits}件 | API: ${report.tokens.toLocaleString()} tokens ($${report.cost.toFixed(6)} / ¥${(report.cost * 150).toFixed(2)})`
        }
      }]
    }
  })

  // 空行を追加
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: []
    }
  })

  const response = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ children: blocks })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error(`  ❌ Notion追記エラー:`, error)
    throw new Error(`Notion append error: ${JSON.stringify(error)}`)
  }

  console.log(`  ✅ ${report.date}の記録を追加しました`)
}

export async function postDailyToNotion(
  report: DailyNotionReport
): Promise<{ url: string }> {
  console.log('📤 Notion に投稿中...')

  // 月別のページタイトルを生成（年月が変わると自動的に新しいページになる）
  const pageTitle = getMonthlyPageTitle(report.date)

  // 既存の月別ページを検索
  let pageId = await findDailyRecordPage(pageTitle)
  let pageUrl: string

  if (!pageId) {
    // ページがなければ作成（新しい月の最初の記録）
    console.log(`  新しい月別ページを作成中: ${pageTitle}`)
    const result = await createDailyRecordPage(pageTitle, report)
    pageId = result.id
    pageUrl = result.url
  } else {
    // 既存ページのURLを取得
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      }
    })
    const data = await response.json() as any
    pageUrl = data.url

    // プロパティを最新の日付に更新
    await updatePageProperties(pageId, report)
  }

  // ページに本日の記録を追記
  await appendToPage(pageId, report)

  console.log(`  ✓ 投稿完了: ${pageUrl}\n`)

  return { url: pageUrl }
}
