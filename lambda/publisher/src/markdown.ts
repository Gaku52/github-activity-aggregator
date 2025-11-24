/**
 * Markdown File Output
 *
 * レポートをMarkdownファイルとして出力（GitHub Pages用）
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MarkdownReportData {
  title: string;
  period_start: string;
  period_end: string;
  content: string;
}

/**
 * Markdownファイルを出力
 */
export async function exportMarkdown(
  report: MarkdownReportData,
  outputDir: string = '/tmp/reports'
): Promise<string> {
  console.log('📄 Markdownファイル出力中...');

  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ファイル名生成
  const filename = `report-${report.period_start}-${report.period_end}.md`;
  const filepath = path.join(outputDir, filename);

  // ファイル書き込み
  fs.writeFileSync(filepath, report.content, 'utf-8');

  console.log(`✅ Markdown出力成功: ${filepath}`);
  return filepath;
}

/**
 * JSONファイルを出力
 */
export async function exportJSON(
  data: any,
  outputDir: string = '/tmp/reports'
): Promise<string> {
  console.log('📋 JSONファイル出力中...');

  // 出力ディレクトリ作成
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ファイル名生成
  const filename = `report-${data.period_start}-${data.period_end}.json`;
  const filepath = path.join(outputDir, filename);

  // ファイル書き込み
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ JSON出力成功: ${filepath}`);
  return filepath;
}
