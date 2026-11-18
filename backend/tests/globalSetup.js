import { MongoMemoryReplSet } from 'mongodb-memory-server';

// One single-node replica set for the whole run (transactions need a replica set).
// Each test file connects to its own database on it (see setup.js).
export default async function setup() {
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.TEST_MONGO_URI = replSet.getUri();
    return () => replSet.stop();
}
