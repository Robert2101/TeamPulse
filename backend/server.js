import 'dotenv/config'; // first import: every module below may read process.env when it loads
import mongoose from 'mongoose';
import { createServer } from 'http';
import app from './app.js';
import { initSocket } from './socket/socket.js';
import logger from './utils/logger.js';
import { initRedis, startRedisKeepAlive } from './config/redis.js';

initRedis();
startRedisKeepAlive(); // Keep the free-tier Upstash database from idling out

const httpServer = createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5001;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        logger.info('Connected to MongoDB successfully');
        httpServer.listen(PORT, () => logger.info(`Server is running on port ${PORT}`));
    })
    .catch((err) => logger.error(`MongoDB connection error: ${err.message}`));
