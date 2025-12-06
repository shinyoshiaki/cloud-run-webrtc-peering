import { Firestore } from "@google-cloud/firestore";

export type OfferRecord = {
  sdp: string;
  createdAt: number;
};

export type AnswerRecord = {
  offerId: string;
  sdp: string;
  createdAt: number;
};

const firestore = new Firestore();
const offers = firestore.collection("offers");
const answers = firestore.collection("answers");

export async function saveOffer(sdp: string): Promise<string> {
  const doc = await offers.add({
    sdp,
    createdAt: Date.now(),
  } satisfies OfferRecord);
  return doc.id;
}

export async function waitForAnswer(
  offerId: string,
  timeoutMs: number,
): Promise<AnswerRecord | null> {
  const docRef = answers.doc(offerId);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);

    const unsubscribe = docRef.onSnapshot(
      (snapshot) => {
        console.log("[Firestore] answer snapshot received", snapshot);
        if (!snapshot.exists) return;
        const data = snapshot.data() as AnswerRecord;
        clearTimeout(timer);
        unsubscribe();
        resolve({ ...data });
      },
      (error) => {
        clearTimeout(timer);
        unsubscribe();
        reject(error);
      },
    );
  });
}

export function firestoreHint(offerId: string) {
  return `offerId=${offerId} stored in Firestore collection 'offers'. Jobs must read it and write answer to 'answers' with doc id=${offerId}.`;
}
