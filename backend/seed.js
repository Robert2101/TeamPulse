// Local/test data: WIPES the database MONGO_URI points at, then creates the roles and one persistent
// copy of the demo company (backend/demo/template.js) with fixed logins. Never run it against a
// database that holds real data. The live demo doesn't need it: visitors get private sandboxes.
//
//   node seed.js            roles + the Fernway workspace
//   node seed.js --empty    roles only (an empty, ready-to-use database)
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ensureRoles } from './utils/roles.js';
import { buildWorkspace, insertWorkspace } from './services/demo.service.js';
import { COMPANY, PEOPLE } from './demo/template.js';

const PASSWORD = 'password123';
const emailFor = (key) => `${key}@${COMPANY.domain}`;

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const name = mongoose.connection.db.databaseName;

    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
    await ensureRoles();
    console.log(`Wiped "${name}" and created the four roles.`);

    if (!process.argv.includes('--empty')) {
        const passwordHash = await bcrypt.hash(PASSWORD, 10);
        const data = await buildWorkspace({ sandbox: false, passwordHash, emailFor });
        await insertWorkspace(data);
        console.log(`Created ${COMPANY.name}: ${data.projects.length} projects, ${data.tasks.length} tasks, ${data.comments.length} comments, ${data.activities.length} history entries.`);
        console.log(`\nSign in with any of these (password "${PASSWORD}"):`);
        for (const [key, person] of Object.entries(PEOPLE)) {
            console.log(`  ${emailFor(key).padEnd(26)} ${person.role.padEnd(16)} ${person.fullName}`);
        }
    }
    await mongoose.disconnect();
};

run().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
});
