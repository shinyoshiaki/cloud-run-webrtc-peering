import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { triggerJob } from "./job-trigger.js";
import { saveOffer, waitForAnswer, firestoreHint } from "./firestore.js";

const app = new Hono();

app.get("/health", (c) => c.text("ok"));

app.post("/session", async (c) => {
  const body = await c.req.json().catch(() => null);
  const sdp: string | undefined = body?.sdp;

  if (!sdp) {
    return c.json({ error: "missing sdp field" }, 400);
  }

  const offerId = await saveOffer(sdp);
  try {
    await triggerJob(offerId);
  } catch (error) {
    console.error("[Service] Failed to start Cloud Run Job", error);
    return c.json(
      { error: "failed to start job", offerId, details: `${error}` },
      500,
    );
  }

  const timeout =
    Number.parseInt(process.env.ANSWER_TIMEOUT_MS ?? "", 10) || 30_000;
  const answer = await waitForAnswer(offerId, timeout);

  if (!answer) {
    return c.json(
      {
        error: "answer timeout",
        offerId,
        hint: firestoreHint(offerId),
      },
      504,
    );
  }

  return c.json({
    offerId,
    answer: answer.sdp,
  });
});

const port = Number.parseInt(process.env.PORT ?? "", 10) || 3000;
serve({ fetch: app.fetch, port });
console.log(
  `[Service] listening on http://localhost:${port} (set PORT to change)`,
);
