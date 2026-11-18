import { beforeEach, describe, expect, it, vi } from 'vitest';

// Gemini is replaced by a scripted stream: each test decides which chunks the "model" sends.
const model = vi.hoisted(() => ({ chunks: [] }));
vi.mock('@google/genai', () => ({
    GoogleGenAI: class {
        models = {
            generateContentStream: async () => (async function* stream() { yield* model.chunks; })(),
        };
    },
}));

const { seed } = await import('./fixtures.js');
const { signIn } = await import('./helpers.js');
const { getIO } = await import('../socket/socket.js');
const { default: Task } = await import('../models/task.model.js');
const { default: Activity } = await import('../models/activity.model.js');

const callTool = (args) => {
    model.chunks = [{ functionCalls: [{ name: 'update_task_status', args }] }];
};

const ask = async (session, query = 'update my task') => {
    const res = await session.post('/api/chatbot/ask').send({ query });
    expect(res.status).toBe(200);
    return res.text
        .split('\n')
        .filter((line) => line.startsWith('data: {'))
        .map((line) => JSON.parse(line.slice(6)).textChunk)
        .join('');
};

describe('AI assistant task tool', () => {
    let f;
    let emit;

    beforeEach(async () => {
        f = await seed();
        emit = vi.fn();
        vi.spyOn(getIO(), 'to').mockReturnValue({ emit });
    });

    it('rejects a status outside the board columns', async () => {
        callTool({ taskId: f.task._id.toString(), newStatus: 'Archived' });
        const max = await signIn('member@acme.test');
        const reply = await ask(max);
        expect(reply).toMatch(/Which of those did you mean/);
        expect((await Task.findById(f.task._id)).taskStatus).toBe('To-Do');
    });

    it('updates like the REST API: validators, completedAt, audit log and a populated broadcast', async () => {
        callTool({ taskId: f.task._id.toString(), newStatus: 'Done' });
        const max = await signIn('member@acme.test');
        const reply = await ask(max);
        expect(reply).toMatch(/to Done/);

        const task = await Task.findById(f.task._id);
        expect(task.taskStatus).toBe('Done');
        expect(task.completedAt).toBeInstanceOf(Date);
        expect(await Activity.exists({ entityId: f.task._id, 'metadata.source': 'chatbot' })).toBeTruthy();

        const [event, broadcast] = emit.mock.calls[0];
        expect(event).toBe('task-updated');
        expect(broadcast.toObject().assignee.fullName).toBe('Max Member');
    });

    it('only touches tasks assigned to the caller', async () => {
        callTool({ taskId: f.task._id.toString(), newStatus: 'Done' });
        const pm = await signIn('pm@acme.test');
        expect(await ask(pm)).toMatch(/couldn't verify/);

        callTool({ taskId: 'Write copy', newStatus: 'Done' });
        const max = await signIn('member@acme.test');
        expect(await ask(max)).toMatch(/couldn't verify/);

        expect((await Task.findById(f.task._id)).taskStatus).toBe('To-Do');
    });

    it('answers 400 for an invalid status on the REST API', async () => {
        const max = await signIn('member@acme.test');
        const res = await max.patch(`/api/tasks/${f.task._id}`).send({ taskStatus: 'Archived' });
        expect(res.status).toBe(400);
    });
});
