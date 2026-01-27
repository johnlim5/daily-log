# Daily Log デプロイ・運用手順

本番環境へのデプロイと日常運用の手順書です。

---

## 環境構成

| 環境 | URL | 用途 |
|------|-----|------|
| 本番 | https://<username>.github.io/daily-log/ | ユーザー向け |
| 開発 | http://localhost:3000 | ローカル開発 |

---

## 前提条件

### 必要なアカウント・権限
- GitHub アカウント（リポジトリへのpush権限）
- Cloudflare アカウント（Workers管理権限）
- Google Cloud アカウント（Gemini API キー）

### 必要なツール
- Node.js 18以上
- npm または yarn
- Git

---

## ローカル開発環境セットアップ

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd daily-log
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.local` ファイルを編集：
```
GEMINI_API_KEY=your_actual_api_key_here
```

> **注意:** `.env.local` は `.gitignore` に含まれており、リポジトリにはコミットされません。

### 4. 開発サーバーの起動
```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

### 5. 動作確認
- ログイン画面が表示されること
- パスワード入力後、データが取得できること

---

## ビルド

### 本番ビルドの作成
```bash
npm run build
```

成果物は `dist/` ディレクトリに出力されます。

### ビルド内容の確認
```bash
npm run preview
```

---

## デプロイ手順（GitHub Pages）

### 自動デプロイ（推奨）
```bash
npm run deploy
```

このコマンドは以下を実行します：
1. `npm run build` （ビルド）
2. `gh-pages -d dist` （dist/をgh-pagesブランチにpush）

### 手動デプロイ
1. ビルドを作成
   ```bash
   npm run build
   ```

2. gh-pagesブランチにpush
   ```bash
   npx gh-pages -d dist
   ```

3. GitHub リポジトリ設定でPages を有効化
   - Settings → Pages → Source: `gh-pages` branch

---

## Cloudflare Worker の設定

### Worker URL
```
https://my-gemini-worker.01-yen-ambient.workers.dev
```

### エンドポイント
| パス | メソッド | 機能 |
|------|----------|------|
| /data | GET | データ取得 |
| /data | POST | データ保存 |
| /gemini | POST | AI分析 |

### Worker の環境変数
Cloudflare ダッシュボードで以下を設定：

| 変数名 | 説明 |
|--------|------|
| `APP_PASSWORD` | アプリのログインパスワード |
| `GEMINI_API_KEY` | Google Gemini API キー |

### Worker コードの更新手順
1. Cloudflare ダッシュボードにログイン
2. Workers & Pages → `my-gemini-worker` を選択
3. 「Quick Edit」または wrangler CLI でコードを更新
4. 「Save and Deploy」

### KV Namespace
- 名前: （要確認）
- データ形式: JSON
- キー: `routines`, `logs`

---

## 環境変数一覧

### フロントエンド（.env.local）
| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GEMINI_API_KEY` | △ | ローカル開発用（本番では Worker が使用） |

### Cloudflare Worker
| 変数名 | 必須 | 説明 |
|--------|------|------|
| `APP_PASSWORD` | ○ | アプリ認証パスワード |
| `GEMINI_API_KEY` | ○ | Gemini API キー |

---

## APIキーの取得・更新

### Gemini API キー
1. [Google AI Studio](https://ai.google.dev/) にアクセス
2. 「Get API Key」をクリック
3. 新しいキーを作成またはコピー
4. Cloudflare Worker の環境変数を更新

### APIキーのローテーション
1. Google AI Studioで新しいキーを作成
2. Cloudflare Workerの環境変数を更新
3. 動作確認
4. 古いキーを削除

---

## 監視

### 確認項目
- [ ] GitHub Pages が正常にホストされているか
- [ ] Cloudflare Worker が応答するか
- [ ] データの取得・保存が動作するか
- [ ] AI分析が動作するか

### 手動ヘルスチェック
```bash
# Worker の疎通確認
curl -I https://my-gemini-worker.01-yen-ambient.workers.dev/data

# 期待: 401 Unauthorized（パスワードなし）または 200 OK
```

### Cloudflare ダッシュボード
- Workers → Analytics でリクエスト数・エラー率を確認
- Logs でエラーログを確認

---

## バックアップ

### データのエクスポート
現在、UIからのエクスポート機能はありません。
Cloudflare KV から直接取得：

```bash
# wrangler CLI を使用
wrangler kv:key get --namespace-id=<NAMESPACE_ID> "data"
```

### 推奨バックアップ頻度
- 週次でKVデータをエクスポート
- Git リポジトリは通常のバージョン管理

---

## ロールバック

### フロントエンドのロールバック
```bash
# 前のコミットに戻してデプロイ
git checkout <previous-commit-hash>
npm run deploy
```

### Worker のロールバック
Cloudflare ダッシュボード → Workers → Deployments から過去のバージョンを選択

---

## トラブルシューティング

### ビルドが失敗する
```bash
# node_modules を再インストール
rm -rf node_modules
npm install
npm run build
```

### デプロイ後に404が出る
- `vite.config.ts` の `base` 設定を確認
  ```typescript
  base: '/daily-log/',  // リポジトリ名と一致させる
  ```

### Worker がタイムアウトする
- Gemini API の応答遅延の可能性
- Cloudflare の無料プランは CPU時間 10ms 制限あり（Gemini呼び出し時は問題ない）

### CORS エラー
- Worker 側で適切なCORSヘッダーを返しているか確認

---

## 連絡先・サポート

| サービス | サポート |
|----------|----------|
| GitHub Pages | https://docs.github.com/pages |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| Gemini API | https://ai.google.dev/docs |
