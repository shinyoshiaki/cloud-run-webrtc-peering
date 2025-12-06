import { FirestoreRepository } from "../firestore.ts";
import type { Instance, WebRTCAnswer, WebRTCOffer } from "../types/index.ts";

// リポジトリ
export const instanceRepository = new FirestoreRepository<Instance>(
  "Instances",
);
export const offerRepository = new FirestoreRepository<WebRTCOffer>(
  "WebRTCOffer",
);
export const answerRepository = new FirestoreRepository<WebRTCAnswer>(
  "WebRTCAnswer",
);
