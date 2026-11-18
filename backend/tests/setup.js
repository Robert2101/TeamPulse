import { afterAll, beforeAll } from 'vitest';
import mongoose from 'mongoose';

// Tests must never reach a real service. Blank values also stop dotenv from filling these in.
Object.assign(process.env, {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret',
    CLIENT_URL: 'http://localhost:5173',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    GEMINI_API_KEY: 'test-key',
    GOOGLE_GEMINI_API_KEY: '',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
});

beforeAll(async () => {
    const dbName = `tp_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await mongoose.connect(process.env.TEST_MONGO_URI, { dbName });
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});
