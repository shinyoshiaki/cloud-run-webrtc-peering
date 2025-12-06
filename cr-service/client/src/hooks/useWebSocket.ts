import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, Message } from "../types";

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: ChatMessage) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  myClientId: string | null;
  instanceId: string | null;
  clients: string[];
  messages: Message[];
  sendChat: (targetClientId: string, message: string) => void;
  sendBroadcast: (message: string) => void;
  requestClients: () => void;
  reconnect: () => void;
}

export function useWebSocket({
  url,
  onMessage,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [myClientId, setMyClientId] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [clients, setClients] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const addMessage = useCallback(
    (type: Message["type"], content: string, clientId?: string) => {
      const message: Message = {
        id: crypto.randomUUID(),
        type,
        content,
        clientId,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
    },
    [],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        addMessage("system", "Connected to server");
      };

      ws.onmessage = (event) => {
        try {
          const data: ChatMessage = JSON.parse(event.data);
          console.log("Received message:", data);

          switch (data.type) {
            case "welcome":
              setMyClientId(data.clientId || null);
              setInstanceId(data.instanceId || null);
              addMessage(
                "system",
                `Welcome! Your ID: ${data.clientId?.slice(0, 8)}... (Instance: ${data.instanceId?.slice(0, 8)}...)`,
              );
              // 接続後にクライアント一覧を取得
              ws.send(JSON.stringify({ type: "clients" }));
              break;

            case "clients":
              setClients(data.clients || []);
              break;

            case "chat":
              addMessage("received", data.message || "", data.clientId);
              break;

            case "broadcast":
              addMessage("broadcast", data.message || "", data.clientId);
              break;
          }

          onMessage?.(data);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        setMyClientId(null);
        addMessage("system", "Disconnected from server");

        // 自動再接続
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        addMessage("system", "Connection error occurred");
      };
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  }, [url, addMessage, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendChat = useCallback(
    (targetClientId: string, message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const chatMessage: ChatMessage = {
          type: "chat",
          targetClientId,
          message,
        };
        wsRef.current.send(JSON.stringify(chatMessage));
        addMessage("sent", `[To ${targetClientId.slice(0, 8)}...] ${message}`);
      }
    },
    [addMessage],
  );

  const sendBroadcast = useCallback(
    (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const broadcastMessage: ChatMessage = {
          type: "broadcast",
          message,
        };
        wsRef.current.send(JSON.stringify(broadcastMessage));
        addMessage("sent", `[Broadcast] ${message}`);
      }
    },
    [addMessage],
  );

  const requestClients = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "clients" }));
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    myClientId,
    instanceId,
    clients,
    messages,
    sendChat,
    sendBroadcast,
    requestClients,
    reconnect,
  };
}
