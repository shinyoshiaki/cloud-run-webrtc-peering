import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import { myInstanceId } from "../config/instance.ts";
import {
  getAllClients,
  registerClient,
  unregisterClient,
} from "../repositories/client-repository.ts";
import type { ChatMessage } from "../types/index.ts";
import {
  broadcastToLocalClients,
  connectedClients,
  forwardBroadcastToOtherInstances,
  routeMessageToClient,
} from "../webrtc/data-channel.ts";

export function setupWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    const clientId = randomUUID();
    console.log(`WebSocket client connected: ${clientId.slice(0, 8)}`);

    // クライアントを登録（ローカルとFirestore）
    connectedClients.set(clientId, { clientId, ws });
    registerClient(clientId).catch((err) =>
      console.error(`Failed to register client in Firestore: ${err}`),
    );

    // Welcomeメッセージを送信
    const welcomeMessage: ChatMessage = {
      type: "welcome",
      clientId: clientId,
      instanceId: myInstanceId,
      message: `Connected to instance ${myInstanceId.slice(0, 8)}`,
    };
    ws.send(JSON.stringify(welcomeMessage));

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ChatMessage;
        console.log(`Received from client ${clientId.slice(0, 8)}:`, message);

        if (message.type === "chat" && message.targetClientId) {
          // 特定のクライアントへのダイレクトメッセージ
          await routeMessageToClient(
            clientId,
            message.targetClientId,
            message.message || "",
          );
        } else if (message.type === "broadcast") {
          // ブロードキャスト
          broadcastToLocalClients(clientId, message.message || "");
          forwardBroadcastToOtherInstances(clientId, message.message || "");
        } else if (message.type === "clients") {
          // 接続中のクライアント一覧を返す（Firestoreから全インスタンスのクライアントを取得）
          try {
            const allClients = await getAllClients();
            const clientsResponse: ChatMessage = {
              type: "clients",
              clients: allClients.map((c) => c.clientId),
              instanceId: myInstanceId,
            };
            ws.send(JSON.stringify(clientsResponse));
          } catch (err) {
            console.error("Failed to get clients from Firestore:", err);
            // フォールバック: ローカルクライアントのみ返す
            const clientsResponse: ChatMessage = {
              type: "clients",
              clients: Array.from(connectedClients.keys()),
              instanceId: myInstanceId,
            };
            ws.send(JSON.stringify(clientsResponse));
          }
        }
      } catch (error) {
        console.error(
          `Error processing message from client ${clientId}:`,
          error,
        );
      }
    });

    ws.on("close", () => {
      console.log(`WebSocket client disconnected: ${clientId.slice(0, 8)}`);
      connectedClients.delete(clientId);
      unregisterClient(clientId).catch((err) =>
        console.error(`Failed to unregister client from Firestore: ${err}`),
      );
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      connectedClients.delete(clientId);
      unregisterClient(clientId).catch((err) =>
        console.error(`Failed to unregister client from Firestore: ${err}`),
      );
    });
  });

  return wss;
}
