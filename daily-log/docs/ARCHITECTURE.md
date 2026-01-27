# Daily Log アーキテクチャ概要

開発者向けの設計ドキュメントです。

---

## システム全体構成

```
┌─────────────────────────────────────────────────────────────────┐
│                        ユーザー（ブラウザ）                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    フロントエンド（GitHub Pages）                  │
│                    React 19 + TypeScript + Vite                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 バックエンド（Cloudflare Workers）                 │
│                      my-gemini-worker                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  /data GET  │    │ /data POST  │    │  /gemini    │         │
│  │ (データ取得) │    │ (データ保存) │    │ (AI分析)    │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────┐    ┌─────────────────┐        │
│  │      Cloudflare KV          │    │   Gemini API    │        │
│  │    (データ永続化)            │    │   (Google AI)   │        │
│  └─────────────────────────────┘    └─────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|----------|------|------------|----------|
| フレームワーク | React | 19.x | 最新のConcurrent Features、軽量 |
| 言語 | TypeScript | 5.8.x | 型安全性、開発体験 |
| ビルドツール | Vite | 6.x | 高速なHMR、シンプルな設定 |
| スタイリング | Tailwind CSS | CDN | ユーティリティファースト、高速開発 |
| グラフ | Recharts | 3.x | React向け、宣言的API |
| ID生成 | nanoid | 5.x | 軽量、URL安全 |
| バックエンド | Cloudflare Workers | - | エッジコンピューティング、低レイテンシ |
| データベース | Cloudflare KV | - | Workers連携、グローバル分散 |
| AI | Google Gemini API | - | 日本語対応、高品質 |
| ホスティング | GitHub Pages | - | 無料、CI/CD連携 |

---

## ディレクトリ構成

```
daily-log/
├── App.tsx              # メインアプリケーション（単一ファイル構成）
├── index.tsx            # エントリーポイント
├── index.html           # HTMLテンプレート
├── types.ts             # 型定義（Routine, RoutineLog, Tab, Category）
├── vite.config.ts       # Vite設定
├── package.json         # 依存関係
├── tsconfig.json        # TypeScript設定
├── .env.local           # 環境変数（ローカル開発用）
├── .gitignore
│
├── components/
│   └── ui.tsx           # 共通UIコンポーネント（Card, Button, Input, Modal）
│
├── services/
│   └── geminiService.ts # AI分析サービス（現在未使用、App.tsx内で直接実装）
│
├── docs/                # ドキュメント
│   ├── USER_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── RUNBOOK.md
│
└── dist/                # ビルド成果物（git管理外推奨）
```

---

## データモデル

### Routine（習慣）
```typescript
interface Routine {
  id: string;        // nanoidで生成
  title: string;     // 習慣名
  emoji: string;     // 絵文字アイコン
  color: string;     // 色（現在未使用）
  order: number;     // 表示順
  category: Category; // 'Morning' | 'Afternoon' | 'Evening'
}
```

### RoutineLog（記録）
```typescript
interface RoutineLog {
  id: string;        // nanoidで生成
  routineId: string; // 紐づくRoutineのID
  timestamp: number; // Unix timestamp (ms)
  note?: string;     // メモ（現在未使用）
}
```

### データフロー
```
[ユーザー操作]
      │
      ▼
[Reactステート更新] ──→ [UIレンダリング]
      │
      ▼
[sync('save', {r, l})] ──→ [Worker /data POST]
                                   │
                                   ▼
                           [Cloudflare KV保存]
```

---

## 主要コンポーネント構成

```
App.tsx
├── ログイン画面
│   └── パスワード入力 → handleLogin() → sync('fetch')
│
└── メイン画面
    ├── サイドバー（デスクトップ）
    │   └── タブナビゲーション
    │
    ├── ヘッダー
    │   └── カテゴリタブ（朝/昼/夜）
    │
    ├── メインコンテンツ
    │   ├── TrackerTab: 習慣記録
    │   ├── ManageTab: 習慣管理
    │   ├── HistoryTab: 履歴表示
    │   └── AnalysisTab: グラフ + AI分析
    │
    ├── モバイルナビゲーション
    │
    └── 絵文字ピッカーモーダル
```

---

## API仕様（Cloudflare Worker）

### GET /data
習慣とログデータを取得

**リクエストヘッダー:**
```
X-App-Password: <パスワード>
```

**レスポンス:**
```json
{
  "routines": [Routine, ...],
  "logs": [RoutineLog, ...]
}
```

### POST /data
習慣とログデータを保存

**リクエストヘッダー:**
```
X-App-Password: <パスワード>
Content-Type: application/json
```

**リクエストボディ:**
```json
{
  "routines": [Routine, ...],
  "logs": [RoutineLog, ...]
}
```

### POST /gemini
AI分析を実行

**リクエストヘッダー:**
```
X-App-Password: <パスワード>
Content-Type: application/json
```

**リクエストボディ:**
```json
{
  "prompt": "分析プロンプト"
}
```

**レスポンス:**
```json
{
  "text": "AI分析結果"
}
```

---

## 状態管理

### グローバル状態（useState）
| 状態 | 用途 |
|------|------|
| `routines` | 習慣リスト |
| `logs` | 記録リスト |
| `password` | 認証パスワード |
| `isAuthorized` | 認証状態 |
| `activeTab` | 現在のタブ |
| `categoryTab` | 現在のカテゴリ（朝/昼/夜） |
| `isFocusMode` | フォーカスモード（集中モード）のON/OFF |
| `postponedTasks` | 「後で」にしたタスクIDのキュー（ラウンドロビン用） |
| `skippedToday` | 「今日はスキップ」したタスクIDリスト |

### 計算された状態（useMemo）
| 状態 | 用途 |
|------|------|
| `activeRoutines` | スキップを除いた有効な習慣リスト |
| `completedCount` | 今日の完了数 |
| `totalCount` | 今日の対象タスク数（スキップ除く） |
| `firstIncompleteIndex` | 次に表示するタスクのインデックス |

### ローカルストレージ
| キー | 用途 |
|------|------|
| `app_password` | パスワード保存（オプション） |
| `analysis_period` | 分析期間設定 |
| `analysis_selected_routines` | 分析対象の習慣ID |
| `focus_mode` | フォーカスモードの設定 |
| `skipped_today` | 今日スキップしたタスク（日付とIDリスト） |

---

## 設計判断記録（ADR）

### ADR-001: 単一ファイルアーキテクチャ
**決定:** メインロジックをApp.tsxに集約

**理由:**
- 小規模アプリのため、分割による複雑性増加を回避
- AI Studio（Google）での開発・プレビューを考慮

**トレードオフ:**
- ファイルが大きくなる（現在約500行）
- テスト困難

### ADR-002: サーバー状態のクライアント管理
**決定:** Cloudflare KVにデータを保存し、変更のたびに全データを上書き保存

**理由:**
- シンプルな実装
- 単一ユーザー利用を想定

**トレードオフ:**
- 同時編集に弱い
- データ量増加時のパフォーマンス懸念

### ADR-003: TailwindCSS CDN利用
**決定:** ビルド時のTailwind処理ではなく、CDNから直接読み込み

**理由:**
- AI Studioでの即時プレビュー対応
- 設定不要

**トレードオフ:**
- 本番ビルドサイズの最適化ができない
- カスタム設定の制限

### ADR-004: フォーカスモードの追加
**決定:** 一覧表示とは別に、1タスクずつ表示する「集中モード」を追加

**理由:**
- 複数タスクがあると「どれからやるか」迷う問題を解決
- 1つに集中することで完了率向上を期待

**トレードオフ:**
- UIコードの分岐が増加
- 状態管理が複雑化

### ADR-005: 後回し機能のラウンドロビン方式
**決定:** 「後で」を押すとキューの末尾に移動し、全員が後回しになると先頭から再表示

**理由:**
- ユーザーが「今やりたいタスク」を自由に選べる
- 「全部後で」にしても永遠にループするため、いつかはやることになる
- 強制感なく、自然な順番変更が可能

**トレードオフ:**
- 永遠に「後で」を押し続けることも可能（ただし進捗0のまま）

---

## 既知の技術的負債

1. **geminiService.ts の未使用**
   - `services/geminiService.ts` が存在するが、App.tsx内で直接API呼び出しを実装
   - リファクタリング推奨

2. **エラーハンドリングの不足**
   - ネットワークエラー時のユーザーフィードバックが不十分
   - リトライ機構なし

3. **テストの不在**
   - ユニットテスト、E2Eテストなし

4. **アクセシビリティ**
   - キーボード操作は部分対応
   - スクリーンリーダー未対応

---

## 今後の拡張ポイント

- [ ] PWA対応（オフライン利用）
- [ ] 複数ユーザー対応
- [ ] データエクスポート機能
- [ ] 通知・リマインダー機能
- [ ] テスト追加
