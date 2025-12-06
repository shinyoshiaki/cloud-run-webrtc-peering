import { Firestore } from "@google-cloud/firestore";
import { myInstanceId } from "../config/instance.ts";

// Firestoreに保存するクライアント情報
export interface StoredClient {
  clientId: string;
  instanceId: string;
  createdAt: Date;
}

const firestore = new Firestore();
const COLLECTION_NAME = "clients";

// クライアントをFirestoreに登録
export async function registerClient(clientId: string): Promise<void> {
  await firestore.collection(COLLECTION_NAME).doc(clientId).set({
    clientId,
    instanceId: myInstanceId,
    createdAt: new Date(),
  });
  console.log(`Client registered in Firestore: ${clientId.slice(0, 8)}`);
}

// クライアントをFirestoreから削除
export async function unregisterClient(clientId: string): Promise<void> {
  await firestore.collection(COLLECTION_NAME).doc(clientId).delete();
  console.log(`Client unregistered from Firestore: ${clientId.slice(0, 8)}`);
}

// 特定のクライアントがどのインスタンスにいるか取得
export async function getClientInstance(
  clientId: string,
): Promise<string | null> {
  const doc = await firestore.collection(COLLECTION_NAME).doc(clientId).get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data() as StoredClient;
  return data.instanceId;
}

// 全クライアント一覧を取得
export async function getAllClients(): Promise<StoredClient[]> {
  const snapshot = await firestore.collection(COLLECTION_NAME).get();
  return snapshot.docs.map((doc) => doc.data() as StoredClient);
}

// このインスタンスの全クライアントを削除（インスタンス終了時用）
export async function cleanupInstanceClients(): Promise<void> {
  const snapshot = await firestore
    .collection(COLLECTION_NAME)
    .where("instanceId", "==", myInstanceId)
    .get();

  const batch = firestore.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  console.log(
    `Cleaned up ${snapshot.docs.length} clients for instance: ${myInstanceId.slice(0, 8)}`,
  );
}
