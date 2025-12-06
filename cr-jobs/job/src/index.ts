import {
  Firestore,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "@google-cloud/firestore";
import { RTCPeerConnection, RTCSessionDescription } from "werift";

type OfferRecord = {
  sdp: string;
  createdAt: number;
};

type AnswerRecord = {
  offerId: string;
  sdp: string;
  createdAt: number;
};

const firestore = new Firestore();

const offersSnap = await firestore.collection("offers").get();
console.log(`[Job] found ${offersSnap.size} offers`);

if (offersSnap.empty) {
  console.log("[Job] no offers to process");
} else {
  const tasks = offersSnap.docs.map((doc) => processOffer(doc));
  await Promise.all(tasks);
}

async function processOffer(doc: DocumentSnapshot | QueryDocumentSnapshot) {
  if (!doc.exists) {
    console.warn(`[Job] offer doc ${doc.id} not found, skipping`);
    return;
  }
  const offerId = doc.id;
  console.log(`[Job] starting for offerId=${offerId}`);
  const offer = doc.data() as OfferRecord;

  const pc = new RTCPeerConnection({
    iceUseLinkLocalAddress: true,
  });

  pc.ondatachannel = (event) => {
    const channel = event.channel;
    console.log(`[Job][${offerId}] data channel opened: ${channel.label}`);
    channel.onmessage = (event) => {
      console.log(`[Job][${offerId}] received: ${event.data}`);
      channel.send(`echo from job: ${event.data}`);
    };
    channel.onopen = () => channel.send("hello from job");
  };
  pc.onconnectionstatechange = () => {
    console.log(`[Job][${offerId}] connection state: ${pc.connectionState}`);
  };
  pc.oniceconnectionstatechange = () => {
    console.log(
      `[Job][${offerId}] ICE connection state: ${pc.iceConnectionState}`,
    );
  };

  console.log(
    `[Job][${offerId}] offer received, setting remote description`,
    offer.sdp,
  );

  await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp, "offer"));
  console.log(`[Job][${offerId}] remote description set`);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  // await waitForIceGatheringComplete(pc);

  const answerDoc: AnswerRecord = {
    offerId,
    sdp: pc.localDescription!.sdp,
    createdAt: Date.now(),
  };
  await firestore.collection("answers").doc(offerId).set(answerDoc);
  console.log(`[Job][${offerId}] stored answer in Firestore`);

  await doc.ref.delete();
  console.log(`[Job][${offerId}] deleted offer from Firestore`);

  await keepRunning(pc, offerId);
}

async function keepRunning(
  pc: RTCPeerConnection,
  offerId: string,
): Promise<void> {
  const maxMs = Number.parseInt(process.env.MAX_SESSION_MS ?? "", 10) || 60_000;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, maxMs);
    pc.onconnectionstatechange = () => {
      console.log(`[Job][${offerId}] connectionState=${pc.connectionState}`);
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        clearTimeout(timer);
        resolve();
      }
    };
  });

  pc.close();
  console.log(`[Job][${offerId}] exiting after session window`);
}
