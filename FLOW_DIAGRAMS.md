# GitHub Activity Aggregator - フロー図

このドキュメントは、GitHub Activity Aggregatorのシステム全体のフローを視覚化したものです。

---

## 📊 1. システム全体フロー

```mermaid
graph TB
    subgraph "トリガー"
        A[EventBridge<br/>週次: 日曜 22:00 JST]
    end

    subgraph "Lambda Functions"
        B[Lambda 1:<br/>GitHub Collector]
        C[Lambda 2:<br/>Report Generator]
        D[Lambda 3:<br/>Multi-Channel Publisher]
    end

    subgraph "データストア"
        E[(Supabase<br/>PostgreSQL)]
        F[(Supabase<br/>Storage)]
    end

    subgraph "外部API"
        G[GitHub API]
    end

    subgraph "配信先"
        H[Notion API]
        I[Slack Webhook]
        J[Email SES]
        K[GitHub Pages]
        L[Custom Webhook]
    end

    A -->|トリガー| B
    B -->|API呼び出し| G
    G -->|リポジトリデータ| B
    B -->|保存| E
    E -->|読込| C
    C -->|レポート生成| F
    F -->|配信データ取得| D
    D -->|配信| H
    D -->|配信| I
    D -->|配信| J
    D -->|配信| K
    D -->|配信| L

    style A fill:#FFE6E6
    style B fill:#E6F3FF
    style C fill:#E6F3FF
    style D fill:#E6F3FF
    style E fill:#FFF9E6
    style F fill:#FFF9E6
    style G fill:#E6FFE6
```

---

## 🔄 2. Lambda 1: GitHub Collector 詳細フロー

```mermaid
flowchart TD
    Start([開始: EventBridge トリガー]) --> Init[環境変数読込<br/>GitHub Token<br/>Supabase認証]
    Init --> FetchRepos[全リポジトリ取得<br/>GET /user/repos]

    FetchRepos --> CheckRepos{リポジトリ<br/>取得成功?}
    CheckRepos -->|No| ErrorHandler1[エラーログ記録<br/>リトライ処理]
    ErrorHandler1 --> End1([失敗終了])

    CheckRepos -->|Yes| UpsertRepos[リポジトリ情報をDB保存<br/>repositories テーブル]
    UpsertRepos --> GetLastWeek[先週の日付計算<br/>since = 7日前]

    GetLastWeek --> LoopRepos{各リポジトリを<br/>順次処理}

    LoopRepos --> FetchCommits[コミット取得<br/>GET /repos/:owner/:repo/commits<br/>?since=先週]

    FetchCommits --> CheckCommits{コミット<br/>存在?}
    CheckCommits -->|No| LoopRepos

    CheckCommits -->|Yes| FetchDetails[各コミット詳細取得<br/>stats情報含む]
    FetchDetails --> SaveCommits[コミット情報保存<br/>commits テーブル]

    SaveCommits --> NextRepo{次のリポジトリ<br/>あり?}
    NextRepo -->|Yes| LoopRepos
    NextRepo -->|No| Aggregate[週次集計データ作成<br/>weekly_activities テーブル]

    Aggregate --> Stats[統計情報計算<br/>- 総コミット数<br/>- 言語分布<br/>- アクティブリポジトリ数]

    Stats --> SaveStats[platform_stats テーブル保存]
    SaveStats --> TriggerNext[Generator Lambda トリガー]
    TriggerNext --> End2([成功終了])

    style Start fill:#E6F3FF
    style End1 fill:#FFE6E6
    style End2 fill:#E6FFE6
    style ErrorHandler1 fill:#FFE6E6
```

---

## 📝 3. Lambda 2: Report Generator 詳細フロー

```mermaid
flowchart TD
    Start([開始: Collector完了後]) --> Init[Supabase接続<br/>環境変数読込]
    Init --> GetPeriod[レポート期間設定<br/>先週月曜〜日曜]

    GetPeriod --> QueryDB[週次データ取得<br/>SELECT * FROM weekly_activities<br/>WHERE week_start >= 期間開始]

    QueryDB --> CheckData{データ<br/>存在?}
    CheckData -->|No| EmptyReport[空レポート生成<br/>「活動なし」メッセージ]
    EmptyReport --> End1([終了])

    CheckData -->|Yes| CalcStats[統計計算<br/>- アクティブリポジトリ数<br/>- 総コミット数<br/>- 総変更行数<br/>- 言語分布]

    CalcStats --> GenNotion[Notion形式生成<br/>- Database properties<br/>- Content blocks]
    GenNotion --> SaveNotion[generated_reports保存<br/>format='notion']

    SaveNotion --> GenMarkdown[Markdown形式生成<br/>- ヘッダー<br/>- 概要セクション<br/>- プロジェクト別詳細]
    GenMarkdown --> SaveMarkdown[generated_reports保存<br/>format='markdown']

    SaveMarkdown --> GenJSON[JSON形式生成<br/>構造化データ]
    GenJSON --> SaveJSON[generated_reports保存<br/>format='json']

    SaveJSON --> GenSlack[Slack形式生成<br/>- Blocks API<br/>- Markdown sections]
    GenSlack --> SaveSlack[generated_reports保存<br/>format='slack']

    SaveSlack --> Upload[Supabase Storage保存<br/>reports/{date}/]
    Upload --> TriggerNext[Publisher Lambda トリガー]
    TriggerNext --> End2([成功終了])

    style Start fill:#E6F3FF
    style End1 fill:#FFF9E6
    style End2 fill:#E6FFE6
```

---

## 📤 4. Lambda 3: Multi-Channel Publisher 詳細フロー

```mermaid
flowchart TD
    Start([開始: Generator完了後]) --> Init[Supabase接続<br/>環境変数読込]
    Init --> GetReports[最新レポート取得<br/>SELECT * FROM generated_reports<br/>ORDER BY created_at DESC<br/>LIMIT 4]

    GetReports --> CheckReports{レポート<br/>存在?}
    CheckReports -->|No| End1([終了: レポートなし])

    CheckReports -->|Yes| CheckNotion{Notion<br/>有効?}

    CheckNotion -->|Yes| PublishNotion[Notion API呼び出し<br/>POST /v1/pages]
    PublishNotion --> CheckNotionSuccess{成功?}
    CheckNotionSuccess -->|Yes| UpdateNotion[notion_page_id更新<br/>published_at記録]
    CheckNotionSuccess -->|No| LogNotionError[エラーログ記録]

    CheckNotion -->|No| CheckSlack
    UpdateNotion --> CheckSlack
    LogNotionError --> CheckSlack

    CheckSlack{Slack<br/>有効?} -->|Yes| PublishSlack[Slack Webhook呼び出し<br/>POST webhook URL]
    PublishSlack --> CheckSlackSuccess{成功?}
    CheckSlackSuccess -->|Yes| LogSlackSuccess[成功ログ記録]
    CheckSlackSuccess -->|No| LogSlackError[エラーログ記録]

    CheckSlack -->|No| CheckEmail
    LogSlackSuccess --> CheckEmail
    LogSlackError --> CheckEmail

    CheckEmail{Email<br/>有効?} -->|Yes| PublishEmail[SES経由メール送信]
    PublishEmail --> LogEmailResult[結果ログ記録]

    CheckEmail -->|No| CheckPages
    LogEmailResult --> CheckPages

    CheckPages{GitHub Pages<br/>有効?} -->|Yes| PublishPages[Markdownファイル<br/>リポジトリにコミット]
    PublishPages --> LogPagesResult[結果ログ記録]

    CheckPages -->|No| CheckWebhook
    LogPagesResult --> CheckWebhook

    CheckWebhook{Custom Webhook<br/>有効?} -->|Yes| PublishWebhook[Webhook送信<br/>POST custom URL]
    PublishWebhook --> LogWebhookResult[結果ログ記録]

    CheckWebhook -->|No| Summary
    LogWebhookResult --> Summary

    Summary[配信結果サマリー作成<br/>成功/失敗カウント] --> SaveResults[配信結果をDB保存]
    SaveResults --> End2([成功終了])

    style Start fill:#E6F3FF
    style End1 fill:#FFF9E6
    style End2 fill:#E6FFE6
    style LogNotionError fill:#FFE6E6
    style LogSlackError fill:#FFE6E6
```

---

## 🗄️ 5. データベース操作フロー

```mermaid
flowchart LR
    subgraph "Collector"
        C1[リポジトリ情報] --> C2[repositories<br/>UPSERT]
        C3[コミット情報] --> C4[commits<br/>INSERT]
        C5[週次集計] --> C6[weekly_activities<br/>UPSERT]
        C7[統計情報] --> C8[platform_stats<br/>INSERT]
    end

    subgraph "Generator"
        G1[weekly_activities<br/>SELECT] --> G2[データ分析]
        G2 --> G3[レポート生成]
        G3 --> G4[generated_reports<br/>INSERT]
    end

    subgraph "Publisher"
        P1[generated_reports<br/>SELECT] --> P2[配信処理]
        P2 --> P3[published_at<br/>UPDATE]
        P2 --> P4[notion_page_id<br/>UPDATE]
    end

    C2 --> G1
    C4 --> G1
    C6 --> G1
    C8 --> G1
    G4 --> P1

    style C2 fill:#E6F3FF
    style C4 fill:#E6F3FF
    style C6 fill:#E6F3FF
    style C8 fill:#E6F3FF
    style G4 fill:#FFE6F3
    style P3 fill:#E6FFE6
    style P4 fill:#E6FFE6
```

---

## ⏱️ 6. タイムラインフロー（週次実行）

```mermaid
gantt
    title 週次実行タイムライン（日曜 22:00〜）
    dateFormat  HH:mm
    axisFormat %H:%M

    section EventBridge
    トリガー発火           :milestone, m1, 22:00, 0m

    section Collector
    初期化                :a1, 22:00, 5s
    リポジトリ取得        :a2, after a1, 10s
    コミット詳細取得      :a3, after a2, 30s
    DB保存・集計          :a4, after a3, 15s

    section Generator
    データ読込            :b1, after a4, 5s
    統計計算              :b2, after b1, 5s
    レポート生成          :b3, after b2, 10s

    section Publisher
    配信処理              :c1, after b3, 10s
    結果記録              :c2, after c1, 5s

    section 完了
    全処理完了            :milestone, m2, after c2, 0m
```

---

## 🔐 7. エラーハンドリングフロー

```mermaid
flowchart TD
    Start([処理開始]) --> Try{処理実行}

    Try -->|成功| Success[正常終了<br/>ステータス200]

    Try -->|失敗| CheckError{エラー種別判定}

    CheckError -->|API Rate Limit| Wait[60秒待機<br/>Exponential Backoff]
    Wait --> Retry{リトライ<br/>3回まで}
    Retry -->|再実行| Try
    Retry -->|上限到達| Fatal1

    CheckError -->|認証エラー| ValidateToken[トークン検証]
    ValidateToken --> Fatal2[Fatal Error<br/>管理者通知]

    CheckError -->|ネットワークエラー| Retry

    CheckError -->|データベースエラー| CheckDB[接続状態確認]
    CheckDB --> Retry

    CheckError -->|その他| LogError[エラーログ記録<br/>CloudWatch Logs]
    LogError --> Fatal3[エラーステータス返却]

    Success --> End1([終了])
    Fatal1 --> Notify1[Slack通知<br/>エラーアラート]
    Fatal2 --> Notify2[Slack通知<br/>重大エラー]
    Fatal3 --> Notify3[Slack通知<br/>処理失敗]

    Notify1 --> End2([異常終了])
    Notify2 --> End2
    Notify3 --> End2

    style Start fill:#E6F3FF
    style Success fill:#E6FFE6
    style End1 fill:#E6FFE6
    style End2 fill:#FFE6E6
    style Fatal1 fill:#FFE6E6
    style Fatal2 fill:#FFE6E6
    style Fatal3 fill:#FFE6E6
```

---

## 🔄 8. データフロー（全体像）

```mermaid
graph LR
    subgraph "データソース"
        A1[GitHub API<br/>リポジトリ情報]
        A2[GitHub API<br/>コミット履歴]
        A3[GitHub API<br/>PR/Issue]
    end

    subgraph "収集・保存"
        B1[(repositories)]
        B2[(commits)]
        B3[(weekly_activities)]
        B4[(platform_stats)]
    end

    subgraph "分析・生成"
        C1[統計計算]
        C2[レポート生成<br/>Notion]
        C3[レポート生成<br/>Markdown]
        C4[レポート生成<br/>JSON]
        C5[レポート生成<br/>Slack]
    end

    subgraph "保存"
        D1[(generated_reports)]
        D2[(Supabase Storage)]
    end

    subgraph "配信"
        E1[Notion Database]
        E2[Slack Channel]
        E3[GitHub Pages]
        E4[Email]
        E5[Custom API]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B2
    B1 --> B3
    B2 --> B3
    B3 --> B4

    B3 --> C1
    B4 --> C1
    C1 --> C2
    C1 --> C3
    C1 --> C4
    C1 --> C5

    C2 --> D1
    C3 --> D1
    C4 --> D1
    C5 --> D1

    C3 --> D2
    C4 --> D2

    D1 --> E1
    D1 --> E2
    D2 --> E3
    D1 --> E4
    D1 --> E5

    style A1 fill:#E6FFE6
    style A2 fill:#E6FFE6
    style A3 fill:#E6FFE6
    style D1 fill:#FFF9E6
    style D2 fill:#FFF9E6
```

---

## 📋 9. 実装フェーズフロー

```mermaid
graph TD
    Start([プロジェクト開始]) --> Phase1[Phase 1: 基盤構築<br/>- Supabase DB設計<br/>- Lambda基本実装<br/>- ローカルテスト]

    Phase1 --> Check1{動作<br/>確認}
    Check1 -->|NG| Phase1
    Check1 -->|OK| Phase2

    Phase2[Phase 2: データ収集<br/>- GitHub API統合<br/>- Collector実装<br/>- エラーハンドリング] --> Check2{テスト<br/>成功?}
    Check2 -->|NG| Phase2
    Check2 -->|OK| Phase3

    Phase3[Phase 3: レポート生成<br/>- Generator実装<br/>- 複数フォーマット対応<br/>- テンプレート作成] --> Check3{レポート<br/>品質OK?}
    Check3 -->|NG| Phase3
    Check3 -->|OK| Phase4

    Phase4[Phase 4: 配信機能<br/>- Publisher実装<br/>- API統合<br/>- 通知機能] --> Check4{配信<br/>成功?}
    Check4 -->|NG| Phase4
    Check4 -->|OK| Phase5

    Phase5[Phase 5: デプロイ<br/>- AWS CDK構築<br/>- CI/CD設定<br/>- 本番デプロイ] --> Check5{本番<br/>動作OK?}
    Check5 -->|NG| Phase5
    Check5 -->|OK| Phase6

    Phase6[Phase 6: 運用<br/>- モニタリング<br/>- 最適化<br/>- 機能拡張] --> Complete([完成])

    style Start fill:#E6F3FF
    style Complete fill:#E6FFE6
    style Check1 fill:#FFF9E6
    style Check2 fill:#FFF9E6
    style Check3 fill:#FFF9E6
    style Check4 fill:#FFF9E6
    style Check5 fill:#FFF9E6
```

---

## 📊 10. レポート生成詳細フロー

```mermaid
flowchart TD
    Start([週次データ取得]) --> GroupByRepo[リポジトリ別<br/>グルーピング]

    GroupByRepo --> CalcCommits[コミット統計<br/>- 総数<br/>- 平均/日<br/>- 最大/最小]

    CalcCommits --> CalcLines[コード変更統計<br/>- 追加行数<br/>- 削除行数<br/>- Net変更]

    CalcLines --> CalcLang[言語分布計算<br/>言語別コミット数]

    CalcLang --> CalcPattern[活動パターン検出<br/>- 曜日別分布<br/>- 時間帯分布]

    CalcPattern --> RankRepos[リポジトリランキング<br/>活動量順ソート]

    RankRepos --> GenSummary[サマリー生成<br/>- トップ3リポジトリ<br/>- 週間ハイライト]

    GenSummary --> FormatNotion{Notion形式}
    FormatNotion --> NotionBlocks[Blocks API形式<br/>構造化データ]

    GenSummary --> FormatMD{Markdown形式}
    FormatMD --> MDContent[見出し・リスト・表<br/>GitHub Pages用]

    GenSummary --> FormatJSON{JSON形式}
    FormatJSON --> JSONData[REST API用<br/>構造化JSON]

    GenSummary --> FormatSlack{Slack形式}
    FormatSlack --> SlackBlocks[Blocks API<br/>リッチメッセージ]

    NotionBlocks --> Save
    MDContent --> Save
    JSONData --> Save
    SlackBlocks --> Save[全フォーマット保存]

    Save --> End([完了])

    style Start fill:#E6F3FF
    style End fill:#E6FFE6
```

---

## 🎯 使用方法

このフロー図は、以下の用途で活用できます:

1. **実装前の設計確認** - システム全体の動作を理解
2. **実装中の参照** - 各Lambda関数の処理フローを確認
3. **デバッグ** - エラー発生時の処理フローを追跡
4. **ドキュメント** - チームや将来の自分への説明資料

---

## 📝 フロー図の見方

### 記号の意味
- **長方形**: 処理・アクション
- **菱形**: 条件分岐・判定
- **円柱**: データベース
- **楕円**: 開始・終了
- **矢印**: データ・制御の流れ

### 色の意味
- **青色**: 開始ポイント
- **緑色**: 成功・完了
- **黄色**: 中間状態・保留
- **赤色**: エラー・失敗

---

**最終更新**: 2025-11-17
