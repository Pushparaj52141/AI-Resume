/**
 * MongoDB service - database connection and collections
 */

import { MongoClient, Db } from 'mongodb';

const uri: string | undefined = process.env.MONGODB_URI;
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (uri) {
  if (process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export default clientPromise;

export function isMongoDBConfigured(): boolean {
  return !!uri && !!clientPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!clientPromise) {
    throw new Error('MongoDB is not configured. Please add MONGODB_URI to .env.local');
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'resume-ai');
}

export async function getResumesCollection() {
  const db = await getDatabase();
  return db.collection('resumes');
}

export async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection('users');
}

export async function getTokenBlacklistCollection() {
  const db = await getDatabase();
  return db.collection('token_blacklist');
}

export async function ensureAuthIndexes() {
  const db = await getDatabase();
  const users = db.collection('users');
  const blacklist = db.collection('token_blacklist');
  const resumes = db.collection('resumes');
  
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
  await blacklist.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  // New index for optimized resume listing
  await resumes.createIndex({ userId: 1, updatedAt: -1 });
}
