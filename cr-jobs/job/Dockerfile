FROM node:22-slim AS builder

# pnpm をインストール
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cr-jobs/job/package.json ./cr-jobs/job/

# 依存をインストール（ビルド用に dev も入れる）
RUN pnpm install --filter @cloud-run-webrtc-peering-jobs/job --frozen-lockfile

# ソースコードをコピーしてビルド
COPY cr-jobs/job ./cr-jobs/job
RUN pnpm --filter @cloud-run-webrtc-peering-jobs/job build

# デプロイ用ディレクトリを作成
RUN pnpm deploy --filter=@cloud-run-webrtc-peering-jobs/job --prod --legacy /app/deploy

# dist ディレクトリをデプロイ先にコピー (pnpm deploy は .gitignore されているファイルを除外するため)
RUN cp -r cr-jobs/job/dist /app/deploy/dist

FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/deploy .

CMD ["node", "dist/index.js"]
