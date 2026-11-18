import mongoose from 'mongoose';

let supported;

// Transactions need a replica set or sharded cluster: Atlas, the docker compose stack and the tests have one.
const transactionsSupported = async () => {
    if (supported === undefined) {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        supported = Boolean(hello.setName) || hello.msg === 'isdbgrid';
    }
    return supported;
};

/**
 * Runs fn(session) in a transaction and returns its result: every write passing `session` commits
 * together or not at all. On a standalone mongod (bare local dev) fn runs with session = null.
 */
export const withTransaction = async (fn) => {
    if (!(await transactionsSupported())) return fn(null);
    let result;
    await mongoose.connection.transaction(async (session) => {
        result = await fn(session);
    });
    return result;
};
