import { RTCPeerConnection } from "werift";
import { setupDataChannelHandlers } from "./data-channel.ts";

// オファーIDとPeerConnectionのマッピングを保持（自分が送信したオファー用）
export const sentOfferPeerConnections = new Map<string, RTCPeerConnection>();
// 受信したオファーに対するPeerConnectionのマッピング
export const receivedOfferPeerConnections = new Map<
  string,
  RTCPeerConnection
>();

// PeerConnectionの共通設定
export function setupPeerConnection(
  pc: RTCPeerConnection,
  label: string,
  remoteInstanceId: string,
) {
  pc.ondatachannel = (event) => {
    const dataChannel = event.channel;
    console.log(`[${label}] DataChannel received: ${dataChannel.label}`);
    // 受信側はinitiatorではない
    setupDataChannelHandlers(dataChannel, label, false, remoteInstanceId);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[${label}] Connection state: ${pc.connectionState}`);
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[${label}] ICE connection state: ${pc.iceConnectionState}`);
  };
}

// 新しいPeerConnectionを作成
export function createPeerConnection(
  label: string,
  remoteInstanceId: string,
): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceUseLinkLocalAddress: true });
  setupPeerConnection(pc, label, remoteInstanceId);
  return pc;
}
