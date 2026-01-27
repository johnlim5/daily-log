# Daily Log

毎日の習慣を記録・分析するシンプルなアプリケーション

![Daily Log](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 概要

Daily Logは、日々のルーチン（習慣）を記録し、継続状況を可視化するWebアプリです。

**主な機能:**
- 朝・昼・夜の時間帯別に習慣を管理
- ワンタップで記録、時刻の修正も可能
- グラフで習慣の実行時刻を可視化
- AIによる習慣分析とアドバイス

## クイックスタート

### 必要なもの
- Node.js 18以上
- npm

### セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
# .env.local の GEMINI_API_KEY を設定

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## 技術スタック

| 技術 | 用途 |
|------|------|
| React 19 | フロントエンドフレームワーク |
| TypeScript | 型安全な開発 |
| Vite | ビルドツール |
| Tailwind CSS | スタイリング |
| Recharts | グラフ描画 |
| Cloudflare Workers | バックエンドAPI |
| Google Gemini | AI分析 |
| GitHub Pages | ホスティング |

## ドキュメント

| ドキュメント | 対象者 | 内容 |
|--------------|--------|------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | ユーザー | 使い方、FAQ |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 開発者 | 設計、コード構成、ADR |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 運用者 | デプロイ手順、環境設定 |
| [RUNBOOK.md](docs/RUNBOOK.md) | 運用者 | 障害対応マニュアル |

## プロジェクト構成

```
daily-log/
├── App.tsx              # メインアプリケーション
├── index.tsx            # エントリーポイント
├── types.ts             # 型定義
├── components/ui.tsx    # 共通UIコンポーネント
├── services/            # 外部サービス連携
├── docs/                # ドキュメント
└── dist/                # ビルド成果物
```

## スクリプト

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果のプレビュー
npm run deploy   # GitHub Pages へデプロイ
npm run lint     # ESLint 実行
```

## バージョン

- 現在: v1.3.0
- [変更履歴](https://github.com/<user>/<repo>/commits/main)

## ライセンス

Private

## 関連リンク

- [AI Studio プレビュー](https://ai.studio/apps/drive/1dxeIQFJah9ozvEZuXGBL-nvNshvnGBEY)
