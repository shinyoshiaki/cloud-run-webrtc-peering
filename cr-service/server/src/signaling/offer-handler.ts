import { RTCSessionDescription } from "werift";
import { myInstanceId } from "../config/instance.ts";
import { setupDataChannelHandlers } from "../webrtc/data-channel.ts";
import { waitForIceGatheringComplete } from "../webrtc/ice-utils.ts";
import {
  createPeerConnection,
  receivedOfferPeerConnections,
  sentOfferPeerConnections,
} from "../webrtc/peer-connection.ts";
import { getOtherInstances } from "./instance-manager.ts";
import { offerRepository } from "./repositories.ts";

// 既に処理済みのオファーを追跡
const processedOffers = new Set<string>();

// 他のインスタンスに対してオファーを送信
export async function sendOffersToOtherInstances(): Promise<void> {
  const otherInstances = await getOtherInstances();

  if (otherInstances.length === 0) {
    console.log("No other instances found. This is the first instance.");
    return;
  }

  console.log(
    `Found ${otherInstances.length} other instance(s). Sending offers...`,
  );

  for (const instance of otherInstances) {
    try {
      console.log(`Creating offer for instance: ${instance.uuid}`);

      const pc = createPeerConnection(
        `Offer to ${instance.uuid.slice(0, 8)}`,
        instance.uuid,
      );

      // DataChannelを作成（オファー側で作成する必要がある）
      const dataChannel = pc.createDataChannel("data");
      // オファー側はinitiatorなのでtrue
      setupDataChannelHandlers(
        dataChannel,
        `Offer to ${instance.uuid.slice(0, 8)}`,
        true,
        instance.uuid,
      );

      // オファーを作成
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // ICE候補の収集が完了するまで待機
      await waitForIceGatheringComplete(pc);
      console.log(
        `ICE gathering complete for offer to ${instance.uuid.slice(0, 8)}`,
      );

      // Firestoreにオファーを保存（ICE候補が含まれた完全なSDPを使用）
      const savedOffer = await offerRepository.save({
        fromInstanceId: myInstanceId,
        toInstanceId: instance.uuid,
        sdp: pc.localDescription!.sdp,
      });

      console.log(
        `Offer sent to instance ${instance.uuid.slice(0, 8)} with offer ID: ${savedOffer.id}`,
      );

      // PeerConnectionを保存
      sentOfferPeerConnections.set(savedOffer.id, pc);
    } catch (error) {
      console.error(`Error sending offer to instance ${instance.uuid}:`, error);
    }
  }
}

// 自分宛てのオファーを監視して応答
export function watchOffersForMe(): void {
  console.log("Starting to watch offers for me...");

  offerRepository.onSnapshot(
    async (offers) => {
      for (const offer of offers) {
        // 既に処理済みのオファーはスキップ
        if (processedOffers.has(offer.id)) {
          continue;
        }

        // 自分宛てのオファーのみ処理
        if (offer.toInstanceId !== myInstanceId) {
          continue;
        }

        processedOffers.add(offer.id);
        console.log(
          `Received offer from instance: ${offer.fromInstanceId.slice(0, 8)}`,
        );
        await offerRepository.delete(offer.id);
        console.log(`Offer deleted: ${offer.id}`);

        try {
          const pc = createPeerConnection(
            `Answer to ${offer.fromInstanceId.slice(0, 8)}`,
            offer.fromInstanceId,
          );

          // リモートディスクリプションを設定
          await pc.setRemoteDescription(
            new RTCSessionDescription(offer.sdp, "offer"),
          );
          console.log(
            `Remote description set for offer from ${offer.fromInstanceId.slice(0, 8)}`,
          );

          // アンサーを作成
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // ICE候補の収集が完了するまで待機
          await waitForIceGatheringComplete(pc);
          console.log(
            `ICE gathering complete for answer to ${offer.fromInstanceId.slice(0, 8)}`,
          );

          // Firestoreにアンサーを保存（ICE候補が含まれた完全なSDPを使用）
          const { answerRepository } = await import("./repositories.ts");
          await answerRepository.save({
            offerId: offer.id,
            fromInstanceId: myInstanceId,
            toInstanceId: offer.fromInstanceId,
            sdp: pc.localDescription!.sdp,
          });

          console.log(
            `Answer sent to instance ${offer.fromInstanceId.slice(0, 8)}`,
          );

          // PeerConnectionを保存
          receivedOfferPeerConnections.set(offer.id, pc);
        } catch (error) {
          console.error(
            `Error processing offer from ${offer.fromInstanceId}:`,
            error,
          );
        }
      }
    },
    { where: { field: "toInstanceId", op: "==", value: myInstanceId } },
  );
}
