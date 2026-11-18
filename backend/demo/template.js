// The demo company every sandbox (and the local seed) is built from: Fernway, a travel-booking startup.
// Times are relative to the moment the sandbox is created: `h` = hours ago, `due` = days from now.
// The data is chosen to exercise every feature: all four roles, every project and task state, overdue
// and due-soon work, unassigned tasks, threads with pinned and edited comments, files and history.

export const COMPANY = { name: 'Fernway', domain: 'fernway.example' };

// The four people a visitor can sign in as. Keys match DEMO_PERSONAS in frontend/src/lib/demo.js.
export const PERSONAS = { admin: 'maya', manager: 'daniel', member: 'lucas', stakeholder: 'grace' };

export const PEOPLE = {
    maya: { fullName: 'Maya Chen', role: 'Admin', jobTitle: 'Head of Product' },
    daniel: { fullName: 'Daniel Okafor', role: 'Project Manager', jobTitle: 'Product Manager, Mobile' },
    priya: { fullName: 'Priya Raman', role: 'Project Manager', jobTitle: 'Product Manager, Platform' },
    lucas: { fullName: 'Lucas Moreau', role: 'Team Member', jobTitle: 'iOS Engineer' },
    aisha: { fullName: 'Aisha Bello', role: 'Team Member', jobTitle: 'Backend Engineer' },
    sam: { fullName: 'Sam Rivera', role: 'Team Member', jobTitle: 'Product Designer' },
    jonas: { fullName: 'Jonas Weber', role: 'Team Member', jobTitle: 'QA Engineer' },
    elena: { fullName: 'Elena Petrova', role: 'Team Member', jobTitle: 'Data Analyst' },
    grace: { fullName: 'Grace Liu', role: 'Stakeholder', jobTitle: 'Partnerships, Skyline Air' },
};

// Static files served by the frontend (frontend/public/demo). Sizes are the real file sizes.
export const FILES = {
    homeFeed: { name: 'home-feed-v3.png', fileType: 'image/png', path: '/demo/home-feed-v3.png', size: 84213 },
    apiSpec: { name: 'partner-api-reference.pdf', fileType: 'application/pdf', path: '/demo/partner-api-reference.pdf', size: 46518 },
    qaChecklist: { name: 'rebooking-qa-checklist.txt', fileType: 'text/plain', path: '/demo/rebooking-qa-checklist.txt', size: 1012 },
};

export const PROJECTS = [
    {
        key: 'APP',
        projectName: 'Mobile app 3.0',
        projectDescription: 'A faster, offline-first booking app for iOS and Android: a new home feed, a trip timeline that works without signal, and one-tap rebooking.',
        projectStatus: 'Active', priority: 'High', projectType: 'Product', clientName: 'Internal', budget: 420000,
        manager: 'daniel', members: ['lucas', 'sam', 'jonas', 'aisha'], start: -45, end: 40, h: 1100,
        tasks: [
            {
                title: 'One-tap rebooking for cancelled flights', status: 'Review', priority: 'Urgent', assignee: 'lucas', due: -1, h: 260,
                description: 'When a flight is cancelled, show the two best alternatives at the top of the trip and rebook with one tap.\n\nDone when:\n- alternatives appear within 30 seconds of the cancellation notice\n- rebooking keeps the seat class and checked bags',
                edits: [{ by: 'daniel', fields: ['priority'], h: 120 }],
                thread: [
                    ['daniel', 'This is the launch feature. Can we get it through review today?', 22],
                    ['jonas', 'Two edge cases left: connecting flights and infant tickets. Details are in the checklist.', 9, { files: ['qaChecklist'] }],
                ],
            },
            {
                title: 'Crash when switching currency on Android', status: 'In-Progress', priority: 'Urgent', assignee: 'lucas', due: 1, h: 40,
                description: 'Switching currency on the price screen crashes on Android 13 and 14 while results are still loading.\n\nSteps: start a search, then switch currency before the results appear.',
                thread: [
                    ['jonas', 'Reproduced on a Pixel 7 and a Galaxy S22. The crash log is in Crashlytics, issue 4183.', 30],
                    ['lucas', 'Found it: the price list re-renders against a cancelled request. Fix is up for review tomorrow morning.', 6],
                ],
            },
            {
                title: 'Offline trip timeline', status: 'In-Progress', priority: 'High', assignee: 'lucas', due: 4, h: 300,
                description: 'Cache the trip timeline so it opens with no connection. Flights, hotels and booking confirmations must be readable offline.\n\nDone when:\n- the timeline opens in airplane mode with the last synced data\n- a banner says when the data is more than 24 hours old',
                thread: [
                    ['daniel', 'How are we handling boarding passes? Those are the screens people open at the gate.', 52],
                    ['lucas', 'They are cached with the timeline, encrypted at rest and cleared on sign-out.', 47],
                    ['jonas', 'I will add airplane-mode runs to the regression suite once this lands.', 12],
                ],
            },
            {
                title: 'Push reminder before online check-in opens', status: 'To-Do', priority: 'Medium', assignee: 'aisha', due: 9, h: 200,
                description: 'Send a push notification 24 hours before online check-in opens, with a deep link to the airline\'s check-in page.',
            },
            {
                title: 'Accessibility pass (WCAG 2.2 AA)', status: 'To-Do', priority: 'High', assignee: null, due: 12, h: 180,
                description: 'Audit every screen with VoiceOver and TalkBack before the store review. Fix focus order, labels and contrast, and list anything we can\'t fix this release.',
                thread: [['daniel', 'Needs an owner. Sam and Jonas, can one of you pick this up after the timeline work?', 70]],
            },
            {
                title: 'App Store and Play Store screenshots', status: 'To-Do', priority: 'Low', assignee: 'sam', due: 20, h: 160,
                description: 'Six screenshots per store in the new brand style: home feed, trip timeline, rebooking, offline mode, price alerts and the boarding pass.',
            },
            {
                title: 'Home feed redesign', status: 'Done', priority: 'High', assignee: 'sam', due: -6, h: 700, doneH: 140,
                description: 'Replace the static home screen with a feed: the next trip first, then price drops on saved searches, then inspiration.',
                thread: [
                    ['sam', 'Final designs attached. Spacing and type follow the new brand system.', 170, { files: ['homeFeed'] }],
                    ['daniel', 'Approved. The trip card at the top is exactly right.', 160],
                ],
            },
            {
                title: 'Triage beta feedback from week 3', status: 'Done', priority: 'Medium', assignee: 'daniel', due: -3, h: 220, doneH: 75,
                description: 'Read every beta report from week 3, merge duplicates and file the top ten as tasks.',
            },
        ],
    },
    {
        key: 'API',
        projectName: 'Partner API',
        projectDescription: 'A public REST API that lets airline and hotel partners push live inventory and receive booking events.',
        projectStatus: 'Active', priority: 'Critical', projectType: 'Platform', clientName: 'Skyline Air', budget: 260000,
        manager: 'priya', members: ['aisha', 'lucas', 'jonas', 'grace'], start: -30, end: 55, h: 760,
        tasks: [
            {
                title: 'Booking webhooks for partners', status: 'In-Progress', priority: 'High', assignee: 'aisha', due: 3, h: 330,
                description: 'Notify partners when a booking is created, changed or cancelled. Payloads are signed, and failed deliveries retry with backoff for 24 hours.',
                thread: [
                    ['grace', 'Skyline Air needs cancellation events first. Their operations team reconciles cancellations every morning.', 50],
                    ['priya', 'Agreed: cancellations ship first, then changes. Pinning this so the order is clear.', 48, { pinned: true }],
                    ['aisha', 'Cancellation events are on staging and passing the contract tests.', 8],
                ],
            },
            {
                title: 'API reference docs', status: 'Review', priority: 'Medium', assignee: 'lucas', due: 2, h: 280,
                description: 'Reference docs for every endpoint, with request and response examples generated from the OpenAPI spec.',
                files: [{ file: 'apiSpec', by: 'lucas', h: 21 }],
                thread: [['lucas', 'The first full draft is attached to this task. Comments welcome before Thursday.', 20]],
            },
            {
                title: 'Load test at 10x launch traffic', status: 'To-Do', priority: 'High', assignee: 'jonas', due: -2, h: 240,
                description: 'Run the k6 suite at ten times the expected launch traffic. Record p95 latency and the error rate for each endpoint.',
                thread: [['priya', 'This slipped past its date. Jonas, can you run it before the webhook review on Thursday?', 18]],
            },
            {
                title: 'Rate limits per partner key', status: 'To-Do', priority: 'High', assignee: 'aisha', due: 10, h: 210,
                description: 'Limit each partner key to 50 requests a second with bursts up to 100, and return Retry-After when a key is over its limit.',
            },
            {
                title: 'Sandbox environment for partners', status: 'To-Do', priority: 'Medium', assignee: null, due: 18, h: 150,
                description: 'A separate environment with test inventory so partners can build against the API without touching real bookings.',
            },
            {
                title: 'Inventory push endpoint', status: 'Done', priority: 'Urgent', assignee: 'aisha', due: -8, h: 650, doneH: 190,
                description: 'POST /v1/inventory lets partners push seat and room availability. Requests are idempotent by partner reference.',
                thread: [['aisha', 'Shipped behind the partner flag. p95 is 140 ms at 50 requests a second.', 195]],
            },
        ],
    },
    {
        key: 'WEB',
        projectName: 'Website relaunch',
        projectDescription: 'A new marketing site and web booking flow, built for search and for speed on slow connections.',
        projectStatus: 'Planning', priority: 'Medium', projectType: 'Marketing', clientName: 'Internal', budget: 90000,
        manager: 'daniel', members: ['sam', 'elena'], start: 7, end: 75, h: 400,
        tasks: [
            {
                title: 'Information architecture and sitemap', status: 'In-Progress', priority: 'Medium', assignee: 'sam', due: 6, h: 120,
                description: 'Map the current pages to the new structure and decide what we redirect, merge or drop.',
            },
            {
                title: 'Landing pages for the top 50 routes', status: 'To-Do', priority: 'Medium', assignee: 'elena', due: 25, h: 100,
                description: 'Use search volume and booking data to pick the 50 routes that most deserve their own landing page.',
            },
            {
                title: 'Analytics and consent plan', status: 'To-Do', priority: 'Low', assignee: 'elena', due: 15, h: 90,
                description: 'Decide which events we track on the new site and how the consent banner affects them.',
            },
        ],
    },
    {
        key: 'SEC',
        projectName: 'SOC 2 Type I',
        projectDescription: 'Controls, policies and evidence for our first SOC 2 audit.',
        projectStatus: 'On Hold', priority: 'High', projectType: 'Compliance', clientName: 'Internal', budget: 45000,
        manager: 'priya', members: ['aisha'], start: -20, end: 120, h: 500,
        tasks: [
            {
                title: 'Access review policy', status: 'Review', priority: 'Medium', assignee: 'priya', due: 30, h: 420,
                description: 'Who reviews access to production systems, how often, and where the evidence is kept.',
                thread: [['priya', 'On hold until the auditor is confirmed in January. Leaving this in review so the draft isn\'t lost.', 80, { edited: true }]],
            },
            {
                title: 'Vendor risk assessments', status: 'To-Do', priority: 'Low', assignee: 'aisha', due: 45, h: 400,
                description: 'Collect security reports from the vendors that process customer data.',
            },
        ],
    },
    {
        key: 'BRD',
        projectName: 'Brand refresh',
        projectDescription: 'A new logo, type and colour system, rolled out across the app, the website and email.',
        projectStatus: 'Completed', priority: 'Medium', projectType: 'Design', clientName: 'Internal', budget: 60000,
        manager: 'priya', members: ['sam'], start: -120, end: -14, h: 2900,
        tasks: [
            { title: 'Logo and wordmark', status: 'Done', priority: 'High', assignee: 'sam', due: -60, h: 2800, doneH: 1500, description: 'Final logo, wordmark and app icon, with usage rules.' },
            { title: 'Colour and type system', status: 'Done', priority: 'Medium', assignee: 'sam', due: -40, h: 2500, doneH: 1000, description: 'Colour tokens, type scale and the rules for using them in product and marketing.' },
            { title: 'Email templates', status: 'Done', priority: 'Low', assignee: 'sam', due: -20, h: 1500, doneH: 500, description: 'Booking confirmation, receipt and trip reminder emails in the new style.' },
        ],
    },
];

// One past conversation with the assistant, so its page shows what it can do. Plain text, like real replies.
export const CHATS = {
    lucas: [
        {
            h: 3,
            query: 'What should I work on first?',
            reply: 'Start with One-tap rebooking for cancelled flights. It is urgent, it was due yesterday, and it is waiting in review. Next is the Android currency-switch crash, also urgent and due tomorrow. After that: Offline trip timeline (high, due in 4 days) and the API reference docs (in review, due in 2 days).',
            intent: 'task_query',
        },
    ],
    maya: [
        {
            h: 5,
            query: 'Give me a quick status of our projects.',
            reply: 'Mobile app 3.0 and Partner API are active. Website relaunch is in planning, SOC 2 Type I is on hold, and Brand refresh is complete.',
            intent: 'project_update',
        },
    ],
};
