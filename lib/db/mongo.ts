import { MongoClient, Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const STATE_DOC_ID = "gwd_event_state";

export function getMongoUri(): string | null {
  let uri = process.env.MONGODB_URI;
  if (!uri) return null;
  uri = uri.trim();
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }
  return uri;
}

export function isMongoConfigured(): boolean {
  return Boolean(getMongoUri());
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = getMongoUri();
  if (!uri) return null;

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db | null> {
  const promise = getMongoClientPromise();
  if (!promise) return null;
  try {
    const client = await promise;
    return client.db("gwdrating");
  } catch (err) {
    console.warn("MongoDB Atlas connection warning:", (err as Error).message);
    return null;
  }
}

export async function loadStateFromMongo<T>(): Promise<T | null> {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const collection = db.collection("app_state");
    const doc = await collection.findOne({ _id: STATE_DOC_ID as any });
    if (!doc) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...state } = doc;
    return state as unknown as T;
  } catch (error) {
    console.warn("Could not load state from MongoDB:", (error as Error).message);
    return null;
  }
}

export async function saveStateToMongo<T>(state: T): Promise<void> {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const collection = db.collection("app_state");
    await collection.replaceOne(
      { _id: STATE_DOC_ID as any },
      { _id: STATE_DOC_ID as any, ...(state as any), _updatedAt: new Date() },
      { upsert: true }
    );
  } catch (error) {
    console.warn("Could not persist state to MongoDB:", (error as Error).message);
  }
}
