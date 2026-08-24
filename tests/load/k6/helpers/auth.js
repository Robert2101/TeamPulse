import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticate with TeamPulse and return the JWT token string + user object.
 * Called ONCE in setup() — never during load iterations.
 *
 * TeamPulse auth flow (from auth.controller.js / auth.middleware.js):
 *   POST /api/auth/login  { emailAddress, password }
 *   → Sets HTTP-only cookie named "token" containing a JWT (1-day expiry)
 *   → Response: { message: "Login successful", user: { _id, fullName, emailAddress, role: {...}, workspace: {...}, ... } }
 *
 * The protectRoute middleware reads req.cookies.token, verifies it with jwt.verify,
 * then populates req.dbUser from either Redis cache (session:user:{userId}, 900s TTL)
 * or MongoDB + populate('role').populate('workspace').
 *
 * Rate limit on /login: 10 requests per 15 minutes per IP (Upstash sliding window).
 * This is why we login exactly ONCE.
 */
export function performLogin(baseUrl, email, password) {
    const loginUrl = `${baseUrl}/api/auth/login`;
    const payload = JSON.stringify({
        emailAddress: email,
        password: password,
    });
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: '/api/auth/login', method: 'POST', workload: 'setup' },
    };

    const res = http.post(loginUrl, payload, params);

    const loginOk = check(res, {
        'login: status is 200': (r) => r.status === 200,
        'login: returns user object': (r) => {
            try { return r.json('user') !== undefined; } catch (e) { return false; }
        },
        'login: token cookie set': (r) => {
            return r.cookies && r.cookies['token'] && r.cookies['token'].length > 0;
        },
    });

    if (!loginOk || res.status !== 200) {
        console.error(`❌ Login failed: status=${res.status}, body=${res.body}`);
        return null;
    }

    const token = res.cookies['token'][0].value;
    const user = res.json('user');

    console.log(`✅ Authenticated as: ${user.fullName} (${user.emailAddress})`);
    console.log(`   Role: ${user.role ? user.role.roleName : 'unknown'}`);
    console.log(`   Workspace: ${user.workspace ? user.workspace.workspaceName : 'unknown'}`);

    return { token, user };
}

/**
 * Complete setup routine: login → discover project / task / comment IDs.
 *
 * If PROJECT_ID, TASK_ID, or COMMENT_ID are provided via __ENV they take
 * priority. Otherwise the function auto-discovers them by querying the API.
 *
 * Returns a JSON-serializable object that k6 distributes to all VUs.
 */
export function performSetup() {
    const baseUrl = __ENV.BASE_URL || 'http://localhost:5001';
    const email = __ENV.TEST_USER_EMAIL || 'tony@stark.com';
    const password = __ENV.TEST_USER_PASSWORD || 'password123';

    // Step 1: Login (single request, rate-limit safe)
    const auth = performLogin(baseUrl, email, password);
    if (!auth) {
        throw new Error('Setup failed: Could not authenticate. Is the server running at ' + baseUrl + '?');
    }

    const { token, user } = auth;
    const cookieHeader = `token=${token}`;

    // Step 2: Discover project IDs
    let projectId = __ENV.PROJECT_ID || null;
    let projectIds = [];

    if (!projectId) {
        const projectsRes = http.get(`${baseUrl}/api/projects`, {
            headers: { Cookie: cookieHeader },
            tags: { endpoint: '/api/projects', method: 'GET', workload: 'setup' },
        });

        if (projectsRes.status === 200) {
            try {
                const projects = projectsRes.json();
                if (Array.isArray(projects) && projects.length > 0) {
                    projectId = projects[0]._id;
                    projectIds = projects.map(function (p) { return p._id; });
                    console.log(`   Found ${projects.length} projects. Primary: ${projectId}`);
                }
            } catch (e) {
                console.warn('⚠️  Could not parse projects response');
            }
        }
    } else {
        projectIds = [projectId];
    }

    // Step 3: Discover task IDs
    let taskId = __ENV.TASK_ID || null;
    let taskIds = [];

    if (!taskId && projectId) {
        const tasksRes = http.get(`${baseUrl}/api/tasks/project/${projectId}`, {
            headers: { Cookie: cookieHeader },
            tags: { endpoint: '/api/tasks/project/:projectId', method: 'GET', workload: 'setup' },
        });

        if (tasksRes.status === 200) {
            try {
                const tasks = tasksRes.json();
                if (Array.isArray(tasks) && tasks.length > 0) {
                    taskId = tasks[0]._id;
                    taskIds = tasks.map(function (t) { return t._id; });
                    console.log(`   Found ${tasks.length} tasks. Primary: ${taskId}`);
                }
            } catch (e) {
                console.warn('⚠️  Could not parse tasks response');
            }
        }
    } else if (taskId) {
        taskIds = [taskId];
    }

    // Step 4: Discover comment IDs
    let commentId = __ENV.COMMENT_ID || null;

    if (!commentId && taskId) {
        const commentsRes = http.get(`${baseUrl}/api/comments/task/${taskId}`, {
            headers: { Cookie: cookieHeader },
            tags: { endpoint: '/api/comments/task/:taskId', method: 'GET', workload: 'setup' },
        });

        if (commentsRes.status === 200) {
            try {
                const comments = commentsRes.json();
                if (Array.isArray(comments) && comments.length > 0) {
                    commentId = comments[0]._id;
                    console.log(`   Found ${comments.length} comments. Primary: ${commentId}`);
                }
            } catch (e) {
                console.warn('⚠️  Could not parse comments response');
            }
        }
    }

    const setupData = {
        token:         token,
        baseUrl:       baseUrl,
        userId:        user._id,
        userEmail:     user.emailAddress,
        userName:      user.fullName,
        userRole:      user.role ? user.role.roleName : 'unknown',
        workspaceId:   user.workspace ? user.workspace._id : null,
        workspaceName: user.workspace ? user.workspace.workspaceName : 'unknown',
        projectId:     projectId,
        projectIds:    projectIds,
        taskId:        taskId,
        taskIds:       taskIds,
        commentId:     commentId,
    };

    console.log('\n📊 Setup complete — test data summary:');
    console.log(`   Base URL:     ${baseUrl}`);
    console.log(`   User:         ${setupData.userName} (${setupData.userRole})`);
    console.log(`   Workspace:    ${setupData.workspaceName} (${setupData.workspaceId || 'N/A'})`);
    console.log(`   Project ID:   ${projectId || 'NONE — some tests may skip project-scoped requests'}`);
    console.log(`   Task ID:      ${taskId || 'NONE — some tests may skip task-scoped requests'}`);
    console.log(`   Comment ID:   ${commentId || 'NONE'}\n`);

    return setupData;
}
