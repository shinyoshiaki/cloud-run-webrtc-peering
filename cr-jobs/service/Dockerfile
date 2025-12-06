FROM node:22-slim AS builder

# pnpm をインストール
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cr-jobs/service/package.json ./cr-jobs/service/

# 必要な依存をインストール
RUN pnpm install --filter @cloud-run-webrtc-peering-jobs/service --frozen-lockfile

# ソースコードをコピーしてビルド
COPY cr-jobs/service ./cr-jobs/service
RUN pnpm --filter @cloud-run-webrtc-peering-jobs/service build

# デプロイ用ディレクトリを作成
RUN pnpm deploy --filter=@cloud-run-webrtc-peering-jobs/service --prod --legacy /app/deploy

# dist ディレクトリをデプロイ先にコピー (pnpm deploy は .gitignore されているファイルを除外するため)
RUN cp -r cr-jobs/service/dist /app/deploy/dist

FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/deploy .

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/index.js"]
