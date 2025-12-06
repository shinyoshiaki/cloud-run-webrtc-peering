import type { RTCPeerConnection } from "werift";
import { WebSocket } from "ws";
import { myInstanceId } from "../config/instance.ts";
import { getClientInstance } from "../repositories/client-repository.ts";
import type { ChatMessage, DataChannelMessage } from "../types/index.ts";

// WebSocketクライアント管理
export interface ChatClient {
  clientId: string;
  ws: WebSocket;
}
export const connectedClients = new Map<string, ChatClient>();

// DataChannelの管理（instanceId -> DataChannel）
export const dataChannels = new Map<
  string,
  ReturnType<RTCPeerConnection["createDataChannel"]>
>();

// DataChannelのメッセージハンドラーを設定
export function setupDataChannelHandlers(
  dataChannel: ReturnType<RTCPeerConnection["createDataChannel"]>,
  label: string,
  isInitiator: boolean,
  remoteInstanceId: string,
) {
  dataChannel.onopen = () => {
    console.log(`[${label}] DataChannel opened`);
    // DataChannelをマップに登録
    dataChannels.set(remoteInstanceId, dataChannel);
    // 接続確立時、initiator側がpingを送信
    if (isInitiator) {
      const pingMessage: DataChannelMessage = {
        type: "ping",
        instanceId: myInstanceId,
        timestamp: Date.now(),
      };
      dataChannel.send(JSON.stringify(pingMessage));
      console.log(`[${label}] Sent ping with instanceId: ${myInstanceId}`);
    }
  };

  dataChannel.onmessage = (e) => {
    console.log(`[${label}] Received message: ${e.data}`);
    try {
      const message = JSON.parse(e.data as string) as DataChannelMessage;
      if (message.type === "ping") {
        console.log(
          `[${label}] Received ping from instanceId: ${message.instanceId}`,
        );
        // pongを返信
        const pongMessage: DataChannelMessage = {
          type: "pong",
          instanceId: myInstanceId,
          timestamp: Date.now(),
        };
        dataChannel.send(JSON.stringify(pongMessage));
        console.log(`[${label}] Sent pong with instanceId: ${myInstanceId}`);
      } else if (message.type === "pong") {
        console.log(
          `[${label}] Received pong from instanceId: ${message.instanceId}`,
        );
      } else if (message.type === "chat" && message.targetClientId) {
        // 他のインスタンスからルーティングされたチャットメッセージ
        console.log(
          `[${label}] Received routed chat for client: ${message.targetClientId}`,
        );
        const targetClient = connectedClients.get(message.targetClientId);
        if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
          const chatResponse: ChatMessage = {
            type: "chat",
            clientId: message.clientId,
            message: message.message,
          };
          targetClient.ws.send(JSON.stringify(chatResponse));
          console.log(
            `[${label}] Delivered routed message to local client: ${message.targetClientId}`,
          );
        } else {
          console.log(
            `[${label}] Target client not found locally: ${message.targetClientId}`,
          );
        }
      } else if (message.type === "chat-broadcast") {
        // ブロードキャストメッセージを受信
        console.log(
          `[${label}] Received broadcast from instanceId: ${message.instanceId}`,
        );
        broadcastToLocalClients(message.clientId!, message.message!);
      }
    } catch {
      console.log(`[${label}] Received non-JSON message: ${e.data}`);
    }
  };

  dataChannel.onclose = () => {
    console.log(`[${label}] DataChannel closed`);
    dataChannels.delete(remoteInstanceId);
  };
}

// ローカルクライアントにブロードキャスト
export function broadcastToLocalClients(fromClientId: string, message: string) {
  for (const [clientId, client] of connectedClients) {
    if (clientId !== fromClientId && client.ws.readyState === WebSocket.OPEN) {
      const chatResponse: ChatMessage = {
        type: "broadcast",
        clientId: fromClientId,
        message: message,
      };
      client.ws.send(JSON.stringify(chatResponse));
    }
  }
}

// 他のインスタンスにブロードキャストを転送
export function forwardBroadcastToOtherInstances(
  fromClientId: string,
  message: string,
) {
  const broadcastMessage: DataChannelMessage = {
    type: "chat-broadcast",
    instanceId: myInstanceId,
    timestamp: Date.now(),
    clientId: fromClientId,
    message: message,
  };
  for (const [instanceId, dc] of dataChannels) {
    if (dc.readyState === "open") {
      dc.send(JSON.stringify(broadcastMessage));
      console.log(`Forwarded broadcast to instance: ${instanceId.slice(0, 8)}`);
    }
  }
}

// 特定のクライアントにメッセージをルーティング
export async function routeMessageToClient(
  fromClientId: string,
  targetClientId: string,
  message: string,
): Promise<boolean> {
  // まずローカルで探す
  const localClient = connectedClients.get(targetClientId);
  if (localClient && localClient.ws.readyState === WebSocket.OPEN) {
    const chatResponse: ChatMessage = {
      type: "chat",
      clientId: fromClientId,
      message: message,
    };
    localClient.ws.send(JSON.stringify(chatResponse));
    return true;
  }

  // Firestoreからターゲットクライアントのインスタンスを取得
  const targetInstanceId = await getClientInstance(targetClientId);
  if (targetInstanceId && targetInstanceId !== myInstanceId) {
    const targetDataChannel = dataChannels.get(targetInstanceId);
    if (targetDataChannel && targetDataChannel.readyState === "open") {
      const routeMessage: DataChannelMessage = {
        type: "chat",
        instanceId: myInstanceId,
        timestamp: Date.now(),
        clientId: fromClientId,
        targetClientId: targetClientId,
        message: message,
      };
      targetDataChannel.send(JSON.stringify(routeMessage));
      console.log(
        `Routed message to specific instance: ${targetInstanceId.slice(0, 8)}`,
      );
      return true;
    }
  }

  // フォールバック: 全ての他インスタンスにルーティング依頼
  const routeMessage: DataChannelMessage = {
    type: "chat",
    instanceId: myInstanceId,
    timestamp: Date.now(),
    clientId: fromClientId,
    targetClientId: targetClientId,
    message: message,
  };
  for (const [instanceId, dc] of dataChannels) {
    if (dc.readyState === "open") {
      dc.send(JSON.stringify(routeMessage));
      console.log(`Routed message to instance: ${instanceId.slice(0, 8)}`);
    }
  }
  return true;
}
