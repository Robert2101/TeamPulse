import 'dotenv/config'; // first import: every module below may read process.env when it loads
import mongoose from 'mongoose';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './socket/socket.js';
import logger from './utils/logger.js';
import { initRedis, startRedisKeepAlive } from './config/redis.js';
import Workspace from './models/workspace.model.js';
import { ensureRoles } from './utils/roles.js';
import { purgeExpiredSandboxes } from './services/demo.service.js';

initRedis();
startRedisKeepAlive(); // Keep the free-tier Upstash database from idling out

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        logger.info('Connected to MongoDB successfully');
        // Drops indexes the schema no longer declares (the old unique index on workspaceName)
        Workspace.syncIndexes().catch((err) => logger.warn(`Workspace index sync failed: ${err.message}`));
        // An empty database is usable straight away: the four roles are created if missing.
        ensureRoles().catch((err) => logger.error(`Role setup failed: ${err.message}`));
        // Demo sandboxes expire after 24 h; sweep now and every 30 minutes.
        const sweep = () => purgeExpiredSandboxes().catch((err) => logger.warn(`Sandbox sweep failed: ${err.message}`));
        sweep();
        setInterval(sweep, 30 * 60 * 1000).unref();
        httpServer.listen(PORT, () => logger.info(`Server is running on port ${PORT}`));
    })
    .catch((err) => logger.error(`MongoDB connection error: ${err.message}`));
