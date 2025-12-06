FROM node:22-slim

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY cr-service/server/package.json ./cr-service/server/

# 依存関係をインストール（対象パッケージのみ）
RUN pnpm install --filter @cloud-run-webrtc-peering/server --frozen-lockfile --prod

# ソースコードをコピー
COPY cr-service/server ./cr-service/server

# ポートを公開
EXPOSE 3000

# 環境変数
ENV PORT=3000

# アプリケーションを起動
CMD ["node", "cr-service/server/src/main.ts"]
