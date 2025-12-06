// インスタンス情報
export interface Instance {
  uuid: string;
  createdAt?: Date;
}

// Offer: fromInstanceIdからtoInstanceIdへのオファー
export interface WebRTCOffer {
  fromInstanceId: string;
  toInstanceId: string;
  sdp: string;
}

// Answer: fromInstanceIdからtoInstanceIdへのアンサー（offerIdで紐付け）
export interface WebRTCAnswer {
  offerId: string;
  fromInstanceId: string;
  toInstanceId: string;
  sdp: string;
}

// DataChannel経由のメッセージ型
export interface DataChannelMessage {
  type: "ping" | "pong" | "chat" | "chat-broadcast";
  instanceId: string;
  timestamp: number;
  // chat用フィールド
  clientId?: string;
  targetClientId?: string;
  message?: string;
}

// WebSocketメッセージ型
export interface ChatMessage {
  type: "chat" | "broadcast" | "clients" | "welcome";
  clientId?: string;
  targetClientId?: string;
  message?: string;
  clients?: string[];
  instanceId?: string;
}
