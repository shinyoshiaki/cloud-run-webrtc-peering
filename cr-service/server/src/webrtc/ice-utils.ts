import type { RTCPeerConnection } from "werift";

// ICE候補の収集が完了するまで待つヘルパー関数
export function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        resolve();
      }
    };
  });
}
