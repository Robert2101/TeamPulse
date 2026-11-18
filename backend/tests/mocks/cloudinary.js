import { vi } from 'vitest';

let counter = 0;

// Stands in for config/cloudinary.js: uploads "succeed" instantly and nothing leaves the machine.
export default {
    uploader: {
        upload_stream: vi.fn((options, callback) => ({
            end: () => {
                counter += 1;
                callback(null, {
                    secure_url: `https://res.cloudinary.test/${options.folder}/file-${counter}`,
                    public_id: `${options.folder}/file-${counter}`,
                    resource_type: 'raw',
                });
            },
        })),
        destroy: vi.fn(async () => ({ result: 'ok' })),
    },
};
