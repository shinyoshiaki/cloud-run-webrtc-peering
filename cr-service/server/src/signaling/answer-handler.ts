import { RTCSessionDescription } from "werift";
import { myInstanceId } from "../config/instance.ts";
import { sentOfferPeerConnections } from "../webrtc/peer-connection.ts";
import { answerRepository } from "./repositories.ts";

// 既に処理済みのアンサーを追跡
const processedAnswers = new Set<string>();

// 自分宛てのアンサーを監視
export function watchAnswersForMe(): void {
  console.log("Starting to watch answers for me...");

  answerRepository.onSnapshot(
    async (answers) => {
      for (const answer of answers) {
        // 既に処理済みのアンサーはスキップ
        if (processedAnswers.has(answer.id)) {
          continue;
        }

        // 自分宛てのアンサーのみ処理
        if (answer.toInstanceId !== myInstanceId) {
          continue;
        }

        processedAnswers.add(answer.id);
        console.log(
          `Received answer from instance: ${answer.fromInstanceId.slice(0, 8)}`,
        );
        await answerRepository.delete(answer.id);
        console.log(`Answer deleted: ${answer.id}`);

        const pc = sentOfferPeerConnections.get(answer.offerId);
        if (!pc) {
          console.log(
            `No PeerConnection found for offer ID: ${answer.offerId}`,
          );
          continue;
        }

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(answer.sdp, "answer"),
          );
          console.log(
            `Remote description (answer) set for offer ID: ${answer.offerId}`,
          );
        } catch (error) {
          console.error(`Error setting remote description for answer:`, error);
        }
      }
    },
    { where: { field: "toInstanceId", op: "==", value: myInstanceId } },
  );
}
