# Cloud Run WebRTC Peering

Google Cloud Run と WebRTC を使った P2P 通信のサンプルプロジェクト。Cloud Run Service/Job と Firestore を使ったシグナリングにより、クライアントとサーバー間で WebRTC DataChannel 接続を確立します。

関連記事　https://zenn.dev/shinyoshiaki/articles/cloudrun-webrtc-p2p-chat

## プロジェクト構成

このプロジェクトは pnpm workspace で構成されたモノレポです。

### cr-service

Cloud Run Service 単体の実装。Firestore をシグナリングに利用します。

- **server**: メッセージングサーバー（Hono + Node.js）
- **client**: React + Vite で構築された Web クライアント
- **infra**: Pulumi による GCP インフラストラクチャ管理

### cr-jobs

Cloud Run ServiceとCloud Run Jobs を組み合わせた実装。Firestore をシグナリングに利用します。

- **service**: HTTP エンドポイントで offer を受け取り、Cloud Run Job をトリガーするサービス
- **job**: Firestore から offer を取得し、WebRTC answer を生成するジョブ
- **client**: Node.js クライアント（werift 使用）
- **infra**: Pulumi による GCP インフラストラクチャ管理

## アーキテクチャ

```
Client --HTTP/WebSocket--> Cloud Run Service
   |                            |
   |                        Firestore (シグナリング)
   |                            |
   +--------WebRTC P2P----------+
```

または

```
Client --HTTP--> Cloud Run Service --trigger--> Cloud Run Job
   |                 |                           |
   |             Firestore (offers/answers) <----+
   +--------------------------P2P WebRTC--------------------------+
```

## 必要な環境

- Node.js 20+
- pnpm 10.17.1+
- Docker（ローカル開発用）
- Google Cloud Platform アカウント（本番デプロイ用）

## セットアップ

### 依存関係のインストール

```bash
pnpm install
```

### Firestore エミュレータの起動

```bash
pnpm compose:up
```

Firestore エミュレータが `localhost:8080` で起動します。

### 開発サーバーの起動

#### cr-service の場合

```bash
# サーバーを起動
pnpm dev

# クライアントを起動（別ターミナル）
pnpm dev:client
```

#### cr-jobs の場合

```bash
# サービス + ジョブを自動起動
pnpm --filter @cloud-run-webrtc-peering-jobs/service dev:auto

# クライアントを実行
pnpm --filter @cloud-run-webrtc-peering-jobs/client start:local
```

## スクリプト

### 開発

- `pnpm dev` - サーバーを開発モードで起動
- `pnpm dev:client` - クライアントを開発モードで起動
- `pnpm build:client` - クライアントをビルド
- `pnpm lint` - コードをチェック & 自動修正

### Docker

- `pnpm docker:deploy:app` - アプリケーションをビルド & プッシュ
- `pnpm docker:deploy:cr-service` - CR Service をビルド & プッシュ
- `pnpm docker:deploy:cr-job` - CR Job をビルド & プッシュ

### Docker Compose

- `pnpm compose:up` - Firestore エミュレータを起動
- `pnpm compose:down` - Firestore エミュレータを停止
- `pnpm compose:logs` - ログを表示

### Firestore 管理

- `pnpm firestore:show` - Firestore のデータを表示
- `pnpm firestore:delete` - Firestore のデータを削除

### インフラストラクチャ

- `pnpm pulumi:preview` - Pulumi 変更をプレビュー
- `pnpm pulumi:up` - インフラストラクチャをデプロイ
- `pnpm pulumi:destroy` - インフラストラクチャを削除

## 技術スタック

### フロントエンド

- React 19
- TypeScript 5
- Vite 7
- Tailwind CSS 4

### バックエンド

- Node.js
- Hono (Web フレームワーク)
- werift (WebRTC ライブラリ)
- WebSocket (ws)

### インフラ & ツール

- Google Cloud Run (Service & Jobs)
- Google Cloud Firestore
- Pulumi (IaC)
- Docker
- Biome (リンター)
- pnpm (パッケージマネージャー)

## 環境変数

プロジェクトルートに `.env` ファイルを作成してください：

```bash
# Docker イメージ
APP_DOCKER=gcr.io/your-project/app
JOBS_SERVICE_DOCKER=gcr.io/your-project/jobs-service
JOBS_JOB_DOCKER=gcr.io/your-project/jobs-job

# GCP プロジェクト
GCLOUD_PROJECT=your-project-id

# ローカル開発（エミュレータ使用時）
FIRESTORE_EMULATOR_HOST=localhost:8080
```

## デプロイ

### 1. Docker イメージのビルド & プッシュ

```bash
pnpm docker:deploy:app
pnpm docker:deploy:cr-service
pnpm docker:deploy:cr-job
```

### 2. Pulumi でインフラをデプロイ

```bash
pnpm pulumi:up
```

## ライセンス

ISC
