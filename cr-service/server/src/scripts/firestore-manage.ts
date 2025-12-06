import { Firestore } from "@google-cloud/firestore";

const firestore = new Firestore();

async function listAllCollections(): Promise<string[]> {
  const collections = await firestore.listCollections();
  return collections.map((col) => col.id);
}

async function getAllDocuments(
  collectionName: string,
): Promise<{ id: string; data: FirebaseFirestore.DocumentData }[]> {
  const snapshot = await firestore.collection(collectionName).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data(),
  }));
}

async function deleteAllDocuments(collectionName: string): Promise<number> {
  const snapshot = await firestore.collection(collectionName).get();
  const batch = firestore.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  return snapshot.docs.length;
}

async function showAllData(): Promise<void> {
  console.log("=== Firestore All Data ===\n");

  const collections = await listAllCollections();

  if (collections.length === 0) {
    console.log("No collections found.");
    return;
  }

  for (const collectionName of collections) {
    console.log(`📁 Collection: ${collectionName}`);
    console.log("-".repeat(40));

    const documents = await getAllDocuments(collectionName);

    if (documents.length === 0) {
      console.log("  (empty)\n");
      continue;
    }

    for (const doc of documents) {
      console.log(`  📄 Document ID: ${doc.id}`);
      console.log(`     Data: ${JSON.stringify(doc.data, null, 2)}`);
    }
    console.log();
  }
}

async function deleteAllData(): Promise<void> {
  console.log("=== Deleting All Firestore Data ===\n");

  const collections = await listAllCollections();

  if (collections.length === 0) {
    console.log("No collections found. Nothing to delete.");
    return;
  }

  let totalDeleted = 0;

  for (const collectionName of collections) {
    const deletedCount = await deleteAllDocuments(collectionName);
    console.log(
      `🗑️  Deleted ${deletedCount} documents from collection: ${collectionName}`,
    );
    totalDeleted += deletedCount;
  }

  console.log(`\n✅ Total deleted: ${totalDeleted} documents`);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case "show":
      await showAllData();
      break;
    case "delete":
      await deleteAllData();
      break;
    default:
      console.log("Usage: node firestore-manage.ts <command>");
      console.log("");
      console.log("Commands:");
      console.log("  show    - Display all Firestore data");
      console.log("  delete  - Delete all Firestore data");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
