/**
 * Learning Content Analyzer
 *
 * コミットメッセージ、ソースコード、diffから学習内容を抽出・分析
 */

export interface DailyLearning {
  date: string; // YYYY-MM-DD
  commits_count: number;
  additions: number;
  deletions: number;
  technologies_used: string[];
  learned_concepts: string[];
  implemented_features: string[];
  summary: string;
}

export interface LearningInsights {
  daily_records: DailyLearning[];
  week_summary: {
    total_commits: number;
    total_lines: number;
    main_technologies: string[];
    key_learnings: string[];
    achievements: string[];
  };
}

// 技術キーワード辞書
const TECH_KEYWORDS = {
  languages: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Swift', 'Kotlin'],
  frameworks: ['React', 'Next.js', 'Vue', 'Angular', 'Express', 'NestJS', 'Django', 'Flask', 'Spring'],
  databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'Firebase', 'DynamoDB'],
  cloud: ['AWS', 'Lambda', 'S3', 'EventBridge', 'CloudWatch', 'EC2', 'RDS', 'GCP', 'Azure'],
  tools: ['Docker', 'Kubernetes', 'Git', 'GitHub Actions', 'CI/CD', 'Terraform', 'Webpack', 'Vite'],
  apis: ['REST API', 'GraphQL', 'WebSocket', 'gRPC', 'Notion API', 'GitHub API', 'Slack API'],
};

// スキルキーワード
const SKILL_KEYWORDS = [
  'サーバーレス', 'マイクロサービス', 'アーキテクチャ設計', 'データベース設計',
  'API設計', 'テスト駆動開発', 'CI/CD', '非同期処理', 'エラーハンドリング',
  'セキュリティ', '認証', 'パフォーマンス最適化', 'デバッグ', 'リファクタリング',
];

// 機能実装キーワード
const FEATURE_KEYWORDS = [
  'implement', 'add', 'create', 'build', 'develop', '実装', '追加', '作成', '開発',
  'integrate', '統合', 'setup', 'configure', '設定', 'deploy', 'デプロイ',
];

// 課題解決キーワード
const CHALLENGE_KEYWORDS = [
  'fix', 'solve', 'resolve', 'debug', 'troubleshoot', '修正', '解決', 'デバッグ',
  'improve', 'optimize', 'refactor', '改善', '最適化', 'リファクタリング',
  'handle', 'manage', '対応', '処理',
];

interface CommitWithDetails {
  message: string;
  committed_at: string;
  additions: number;
  deletions: number;
  files_changed: number;
  metadata?: {
    files?: Array<{
      filename: string;
      status: string;
      patch?: string;
    }>;
  };
}

/**
 * 日毎の学習記録を生成
 */
export function analyzeLearning(
  commits: CommitWithDetails[],
  repositories: Array<{ name: string; language: string | null }>
): LearningInsights {
  // 日付毎にコミットをグループ化
  const commitsByDate = groupCommitsByDate(commits);

  // 日毎の学習記録を生成
  const daily_records: DailyLearning[] = [];

  for (const [date, dayCommits] of Object.entries(commitsByDate)) {
    const technologies = extractTechnologiesFromCommits(dayCommits, repositories);
    const concepts = extractLearnedConcepts(dayCommits);
    const features = extractImplementedFeatures(dayCommits);
    const summary = generateDailySummary(dayCommits, technologies, features);

    daily_records.push({
      date,
      commits_count: dayCommits.length,
      additions: dayCommits.reduce((sum, c) => sum + c.additions, 0),
      deletions: dayCommits.reduce((sum, c) => sum + c.deletions, 0),
      technologies_used: technologies,
      learned_concepts: concepts,
      implemented_features: features,
      summary,
    });
  }

  // 週のサマリーを生成
  const week_summary = generateWeekSummary(daily_records, commits);

  return {
    daily_records: daily_records.sort((a, b) => a.date.localeCompare(b.date)),
    week_summary,
  };
}

/**
 * コミットを日付毎にグループ化
 */
function groupCommitsByDate(commits: CommitWithDetails[]): Record<string, CommitWithDetails[]> {
  const grouped: Record<string, CommitWithDetails[]> = {};

  for (const commit of commits) {
    const date = commit.committed_at.split('T')[0]; // YYYY-MM-DD
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(commit);
  }

  return grouped;
}

/**
 * コミットから使用技術を抽出
 */
function extractTechnologiesFromCommits(
  commits: CommitWithDetails[],
  repositories: Array<{ language: string | null }>
): string[] {
  const found = new Set<string>();

  // リポジトリの言語から抽出
  repositories.forEach(repo => {
    if (repo.language) {
      found.add(repo.language);
    }
  });

  // コミットメッセージとファイル名から技術を抽出
  commits.forEach(commit => {
    const messages = commit.message;

    // メッセージから技術キーワードを検索
    Object.values(TECH_KEYWORDS).flat().forEach(tech => {
      if (messages.includes(tech)) {
        found.add(tech);
      }
    });

    // ファイル拡張子から技術を推測
    if (commit.metadata?.files) {
      commit.metadata.files.forEach(file => {
        const ext = file.filename.split('.').pop()?.toLowerCase();
        if (ext === 'ts' || ext === 'tsx') found.add('TypeScript');
        if (ext === 'js' || ext === 'jsx') found.add('JavaScript');
        if (ext === 'py') found.add('Python');
        if (ext === 'go') found.add('Go');
        if (ext === 'rs') found.add('Rust');
        if (ext === 'sql') found.add('SQL');

        // フレームワーク検出
        if (file.filename.includes('package.json')) {
          // package.jsonの変更があれば、diffから依存関係を確認
          if (file.patch) {
            if (file.patch.includes('react')) found.add('React');
            if (file.patch.includes('next')) found.add('Next.js');
            if (file.patch.includes('supabase')) found.add('Supabase');
            if (file.patch.includes('notion')) found.add('Notion API');
          }
        }
      });
    }
  });

  return Array.from(found).slice(0, 8); // 上位8個
}

/**
 * 学習した概念を抽出（コメント、コミットメッセージから）
 */
function extractLearnedConcepts(commits: CommitWithDetails[]): string[] {
  const concepts = new Set<string>();

  commits.forEach(commit => {
    const message = commit.message.toLowerCase();

    // パターンベースで概念を検出
    const conceptPatterns = [
      { pattern: /database.*design|schema.*design/i, concept: 'データベース設計' },
      { pattern: /error.*handl|exception/i, concept: 'エラーハンドリング' },
      { pattern: /async|await|promise/i, concept: '非同期処理' },
      { pattern: /api.*design|rest.*api/i, concept: 'API設計' },
      { pattern: /auth|authentication/i, concept: '認証・認可' },
      { pattern: /test|testing/i, concept: 'テスト駆動開発' },
      { pattern: /lambda|serverless/i, concept: 'サーバーレスアーキテクチャ' },
      { pattern: /deploy|ci\/cd/i, concept: 'デプロイ自動化' },
    ];

    conceptPatterns.forEach(({ pattern, concept }) => {
      if (pattern.test(message)) {
        concepts.add(concept);
      }
    });

    // ソースコード内のコメントから学習内容を抽出
    if (commit.metadata?.files) {
      commit.metadata.files.forEach(file => {
        if (file.patch) {
          // + から始まるコメント行を抽出
          const commentLines = file.patch
            .split('\n')
            .filter(line => line.startsWith('+') && (line.includes('//') || line.includes('/*')));

          commentLines.forEach(line => {
            // 学習を示すキーワード
            if (line.match(/学習|learn|understand|figure out|理解/i)) {
              // コメントの内容を抽出（簡易版）
              const match = line.match(/(?:学習|learn)[：:]\s*(.+)/i);
              if (match && match[1].length < 50) {
                concepts.add(match[1].trim());
              }
            }
          });
        }
      });
    }
  });

  return Array.from(concepts).slice(0, 5);
}

/**
 * 英語のコミットメッセージを日本語に翻訳
 */
function translateCommitMessage(message: string): string {
  // 先頭の絵文字やプレフィックスを除去
  let cleaned = message.replace(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf)(\(.+?\))?:\s*/i, '');
  cleaned = cleaned.replace(/^[✨🐛📝💄♻️✅🔧🚀📦🎨⚡️]+\s*/, '');

  // よくある英語フレーズを日本語に変換
  const translations: Record<string, string> = {
    'Add ': '追加: ',
    'Update ': '更新: ',
    'Fix ': '修正: ',
    'Remove ': '削除: ',
    'Implement ': '実装: ',
    'Create ': '作成: ',
    'Build ': '構築: ',
    'Setup ': 'セットアップ: ',
    'Configure ': '設定: ',
    'Refactor ': 'リファクタリング: ',
    'Improve ': '改善: ',
    'Optimize ': '最適化: ',
    'Deploy ': 'デプロイ: ',
    'Integrate ': '統合: ',
    'Complete ': '完了: ',
  };

  // 英語フレーズを日本語に置換
  for (const [eng, jpn] of Object.entries(translations)) {
    if (cleaned.startsWith(eng)) {
      cleaned = cleaned.replace(eng, jpn);
      break;
    }
  }

  // 一般的な英単語・フレーズを日本語に変換
  const wordTranslations: Record<string, string> = {
    'Pre-implementation checklist': '事前実装チェックリスト',
    'implementation guides': '実装ガイド',
    'implementation': '実装',
    'documentation': 'ドキュメント',
    'checklist': 'チェックリスト',
    'requirement': '要件',
    'requirements': '要件',
    'guide': 'ガイド',
    'guides': 'ガイド',
    'schedule': 'スケジュール',
    'schedules': 'スケジュール',
    'all schedules': '全スケジュール',
    'complete': '完全な',
    'comprehensive': '包括的な',
    'supplementary': '補足',
    'troubleshooting': 'トラブルシューティング',
    'flow diagrams': 'フロー図',
    'system architecture': 'システムアーキテクチャ',
    'design documents': '設計ドキュメント',
    'security': 'セキュリティ',
    'operations': '運用',
    'API spec': 'API仕様',
    'backup': 'バックアップ',
    'project setup': 'プロジェクトセットアップ',
    'initialization': '初期化',
    'progress': '進捗',
    'test scripts': 'テストスクリプト',
    'with': 'を含む',
    'and': 'と',
    'for': 'の',
    'API': 'API',
    'CLI': 'CLI',
    'Lambda': 'Lambda',
    'function': '関数',
    'Phase': 'フェーズ',
    'configuration': '設定',
    'automation': '自動化',
    'setup': 'セットアップ',
  };

  // 長いフレーズから順に置換（部分一致を防ぐ）
  const sortedTranslations = Object.entries(wordTranslations)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [eng, jpn] of sortedTranslations) {
    const regex = new RegExp(eng, 'gi');
    cleaned = cleaned.replace(regex, jpn);
  }

  // 余分な「の」の連続を修正
  cleaned = cleaned.replace(/の\s*の/g, 'の');

  // 冠詞などの不要な単語を削除
  cleaned = cleaned.replace(/\b(with|the|a|an|of)\b/gi, '');

  // 余分なスペースを整理
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * 実装した機能を抽出
 */
function extractImplementedFeatures(commits: CommitWithDetails[]): string[] {
  const features: string[] = [];

  commits.forEach(commit => {
    const firstLine = commit.message.split('\n')[0];

    // 機能実装を示すキーワードを含むコミット
    const isFeature = FEATURE_KEYWORDS.some(keyword =>
      firstLine.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isFeature && firstLine.length < 100) {
      // 日本語に翻訳して追加
      const translated = translateCommitMessage(firstLine);
      features.push(translated);
    }
  });

  // 重複削除と上位5件のみ
  return [...new Set(features)].slice(0, 5);
}

/**
 * 日毎のサマリーを生成（日本語での進捗記録）
 */
function generateDailySummary(
  commits: CommitWithDetails[],
  technologies: string[],
  features: string[]
): string {
  const totalLines = commits.reduce((sum, c) => sum + c.additions + c.deletions, 0);
  const additions = commits.reduce((sum, c) => sum + c.additions, 0);
  const deletions = commits.reduce((sum, c) => sum + c.deletions, 0);
  const filesChanged = commits.reduce((sum, c) => sum + c.files_changed, 0);

  // 使用技術の列挙
  const techList = technologies.length > 0
    ? technologies.slice(0, 3).join('、')
    : '各種技術';

  // 進捗の種類を判定
  let progressType = '';
  const hasFeatures = features.length > 0;
  const hasChallenges = commits.some(c =>
    CHALLENGE_KEYWORDS.some(kw => c.message.toLowerCase().includes(kw.toLowerCase()))
  );

  if (hasFeatures && hasChallenges) {
    progressType = '新機能の実装と既存機能の改善';
  } else if (hasFeatures) {
    progressType = '新機能の実装';
  } else if (hasChallenges) {
    progressType = 'バグ修正と改善';
  } else {
    progressType = '開発作業';
  }

  // 詳細なサマリー生成
  const parts = [];

  // 基本情報
  if (commits.length === 1) {
    parts.push(`本日は${techList}を使用して${progressType}を実施しました。`);
  } else {
    parts.push(`本日は${commits.length}件のコミットを通じて、${techList}を使用した${progressType}を行いました。`);
  }

  // 主な成果
  if (features.length > 0) {
    const mainFeature = features[0].replace(/^(implement|add|create|build|develop|実装|追加|作成|開発)\s*/i, '');
    parts.push(`主な成果として「${mainFeature}」を達成しました。`);
  }

  // 変更量の詳細
  parts.push(`合計${filesChanged}ファイルを変更し、${additions}行の追加と${deletions}行の削除を行いました。`);

  return parts.join(' ');
}

/**
 * 週のサマリーを生成
 */
function generateWeekSummary(
  daily_records: DailyLearning[],
  allCommits: CommitWithDetails[]
): {
  total_commits: number;
  total_lines: number;
  main_technologies: string[];
  key_learnings: string[];
  achievements: string[];
} {
  const total_commits = allCommits.length;
  const total_lines = allCommits.reduce((sum, c) => sum + c.additions + c.deletions, 0);

  // 全日の技術を集約
  const allTechs = new Set<string>();
  daily_records.forEach(day => {
    day.technologies_used.forEach(tech => allTechs.add(tech));
  });

  // 全日の概念を集約
  const allConcepts = new Set<string>();
  daily_records.forEach(day => {
    day.learned_concepts.forEach(concept => allConcepts.add(concept));
  });

  // 主要な実装を抽出
  const allFeatures: string[] = [];
  daily_records.forEach(day => {
    allFeatures.push(...day.implemented_features);
  });

  return {
    total_commits,
    total_lines,
    main_technologies: Array.from(allTechs).slice(0, 8),
    key_learnings: Array.from(allConcepts).slice(0, 5),
    achievements: [...new Set(allFeatures)].slice(0, 8),
  };
}
