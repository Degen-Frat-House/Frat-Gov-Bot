import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

let db: Db;
let users: Collection;
let proposals: Collection;
let votes: Collection;

export async function setupDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  db = client.db('governance_bot');
  users = db.collection('users');
  proposals = db.collection('proposals');
  votes = db.collection('votes');

  // Create indexes
  await users.createIndex({ telegramId: 1 }, { unique: true });
  await proposals.createIndex({ id: 1 }, { unique: true });
  await votes.createIndex({ proposalId: 1, userId: 1 }, { unique: true });
}

export async function getUserByTelegramId(telegramId: string) {
  return users.findOne({ telegramId });
}

export async function linkWalletToUser(telegramId: string, walletAddress: string) {
  await users.updateOne(
    { telegramId },
    { $set: { walletAddress } },
    { upsert: true }
  );
}

export async function createProposal(proposal: any) {
  const result = await proposals.insertOne(proposal);
  return { ...proposal, id: result.insertedId };
}

export async function getProposal(id: string) {
  try {
    return await proposals.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('Error in getProposal:', error);
    return null;
  }
}

export async function recordVote(vote: any) {
  await votes.updateOne(
    { proposalId: vote.proposalId, userId: vote.userId },
    { $set: vote },
    { upsert: true }
  );
}

export async function getVotes(proposalId: string) {
  return votes.find({ proposalId }).toArray();
}
