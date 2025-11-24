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
      features.push(firstLine);
    }
  });

  // 重複削除と上位5件のみ
  return [...new Set(features)].slice(0, 5);
}

/**
 * 日毎のサマリーを生成
 */
function generateDailySummary(
  commits: CommitWithDetails[],
  technologies: string[],
  features: string[]
): string {
  const totalLines = commits.reduce((sum, c) => sum + c.additions + c.deletions, 0);
  const mainTech = technologies[0] || '各種技術';
  const mainFeature = features[0] || '開発作業';

  if (commits.length === 1) {
    return `${mainTech}を使用して${mainFeature}を実施（${totalLines}行変更）`;
  } else {
    return `${commits.length}件のコミットで${mainTech}を使用した開発。${mainFeature}など（計${totalLines}行変更）`;
  }
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
