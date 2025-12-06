import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { cleanupInstanceClients } from "./repositories/client-repository.ts";
import { app } from "./server/http-server.ts";
import { setupWebSocketServer } from "./server/websocket-server.ts";
import { watchAnswersForMe } from "./signaling/answer-handler.ts";
import { registerInstance } from "./signaling/instance-manager.ts";
import {
  sendOffersToOtherInstances,
  watchOffersForMe,
} from "./signaling/offer-handler.ts";

async function main() {
  console.log("Starting WebRTC peer signaling...");

  watchOffersForMe();
  watchAnswersForMe();

  await registerInstance();
  await sendOffersToOtherInstances();

  // Honoサーバーを起動
  const port = Number(process.env.PORT) || 3000;
  const server = serve({
    fetch: app.fetch,
    port,
  });
  console.log(`Health server listening on port ${port}`);

  // WebSocketサーバーをHTTPサーバーにアタッチ
  setupWebSocketServer(server as unknown as Server);
  console.log(`WebSocket server listening on ws://localhost:${port}`);
  console.log("Signaling process started. Watching for offers and answers...");

  // プロセス終了時にクライアントをクリーンアップ
  const cleanup = async () => {
    console.log("Cleaning up clients before shutdown...");
    await cleanupInstanceClients();
    process.exit(0);
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

main().catch(console.error);
