// WebSocketメッセージ型
export interface ChatMessage {
  type: "chat" | "broadcast" | "clients" | "welcome";
  clientId?: string;
  targetClientId?: string;
  message?: string;
  clients?: string[];
  instanceId?: string;
}

export interface Message {
  id: string;
  type: "sent" | "received" | "broadcast" | "system";
  content: string;
  clientId?: string;
  timestamp: Date;
}
