import { Firestore } from "@google-cloud/firestore";

export class FirestoreRepository<T extends object> {
  private firestore: Firestore;
  private collectionName: string;

  constructor(collectionName: string) {
    this.firestore = new Firestore();
    this.collectionName = collectionName;
  }

  async save(data: T): Promise<{ id: string }> {
    const docRef = await this.firestore.collection(this.collectionName).add({
      ...data,
      createdAt: new Date(),
    });
    console.log(`Document saved with ID: ${docRef.id}`);
    return { id: docRef.id };
  }

  async findById(id: string): Promise<(T & { id: string }) | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as T & { id: string };
  }

  async findAll(): Promise<(T & { id: string })[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (T & { id: string })[];
  }

  async delete(id: string): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
    console.log(`Document deleted with ID: ${id}`);
  }

  onSnapshot(
    callback: (docs: (T & { id: string })[]) => void,
    options?: {
      where?: {
        field: string;
        op: FirebaseFirestore.WhereFilterOp;
        value: unknown;
      };
    },
  ): () => void {
    let query: FirebaseFirestore.Query = this.firestore.collection(
      this.collectionName,
    );

    if (options?.where) {
      query = query.where(
        options.where.field,
        options.where.op,
        options.where.value,
      );
    }

    const unsubscribe = query.onSnapshot((snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (T & { id: string })[];
      callback(docs);
    });

    return unsubscribe;
  }
}
