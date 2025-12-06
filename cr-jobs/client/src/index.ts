import { RTCPeerConnection, RTCSessionDescription } from "werift";

const serviceUrl = process.env.SERVICE_URL ?? "http://localhost:3000";

async function main() {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  const channel = pc.createDataChannel("data");
  channel.onopen = () => {
    console.log("[Client] data channel open, sending hello");
    channel.send("hello from client");
  };
  channel.onmessage = (event) =>
    console.log(`[Client] received: ${event.data}`);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  // await waitForIceGatheringComplete(pc);

  console.log("[Client] sending offer to service", pc.localDescription!.sdp);

  const resp = await fetch(`${serviceUrl}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sdp: pc.localDescription!.sdp }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`[Client] service responded with ${resp.status}: ${text}`);
  }

  const { answer, offerId } = (await resp.json()) as {
    answer: string;
    offerId: string;
  };

  console.log(`[Client] received answer for offerId=${offerId}`, answer);
  await pc.setRemoteDescription(new RTCSessionDescription(answer, "answer"));

  await waitForConnection(pc);
  channel.send("ping from client");

  // keep alive briefly to see echo
  setTimeout(() => {
    channel.send("second ping from client");
  }, 2_000);

  await new Promise((resolve) => setTimeout(resolve, 5_000));
  pc.close();
  console.log("[Client] closed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function waitForConnection(pc: RTCPeerConnection): Promise<void> {
  if (pc.connectionState === "connected") return Promise.resolve();

  return new Promise((resolve, reject) => {
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        resolve();
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        reject(new Error(`[Client] connection failed: ${pc.connectionState}`));
      }
    };
  });
}
