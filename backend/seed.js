// Seeds the demo company (backend/demo/template.js): Fernway, with real accounts that sign in with a password.
//
//   node seed.js --reset-demo   Replaces only the demo workspace. Safe on production: other workspaces are
//                               never touched. The nightly GitHub Action (.github/workflows/demo-reset.yml) runs this.
//   node seed.js                WIPES the whole database MONGO_URI points at, then creates the roles and the
//                               demo workspace. For local development and tests only.
//   node seed.js --empty        WIPES the whole database, then creates the roles only.
import 'dotenv/config';
import mongoose from 'mongoose';
import { ensureRoles } from './utils/roles.js';
import { DEMO_PASSWORD, demoEmail, resetDemoWorkspace } from './services/demo.service.js';
import { COMPANY, PEOPLE } from './demo/template.js';

const has = (flag) => process.argv.includes(flag);

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const name = mongoose.connection.db.databaseName;

    if (!has('--reset-demo')) {
        await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
        await ensureRoles();
        console.log(`Wiped "${name}" and created the four roles.`);
    }

    if (!has('--empty')) {
        const data = await resetDemoWorkspace();
        console.log(`${COMPANY.name} is ready in "${name}": ${data.projects.length} projects, ${data.tasks.length} tasks, ${data.comments.length} comments, ${data.activities.length} history entries.`);
        console.log(`\nSign in with any of these (password "${DEMO_PASSWORD}"):`);
        for (const [key, person] of Object.entries(PEOPLE)) {
            console.log(`  ${demoEmail(key).padEnd(26)} ${person.role.padEnd(16)} ${person.fullName}`);
        }
    }
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});
