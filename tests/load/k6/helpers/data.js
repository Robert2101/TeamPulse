/**
 * Test data generators for k6 load tests.
 *
 * Write tests prefix all created data with "k6-loadtest-" so it can be
 * identified and manually cleaned up with:
 *
 *   db.projects.deleteMany({ projectName: /^k6-loadtest-/ })
 *   db.tasks.deleteMany({ taskName: /^k6-loadtest-/ })
 *   db.comments.deleteMany({ commentContent: /^k6-loadtest-/ })
 */

/**
 * Unique project name — includes timestamp + VU + iteration.
 */
export function uniqueProjectName() {
    return 'k6-loadtest-project-' + Date.now() + '-vu' + __VU + '-i' + __ITER;
}

/**
 * Unique task name.
 */
export function uniqueTaskName() {
    return 'k6-loadtest-task-' + Date.now() + '-vu' + __VU + '-i' + __ITER;
}

/**
 * Unique comment text.
 */
export function uniqueComment() {
    return 'k6-loadtest-comment-' + Date.now() + '-vu' + __VU;
}

/**
 * Random task priority.
 * Must match Task model enum: ["Low", "Medium", "High", "Urgent"]
 */
export function randomTaskPriority() {
    var priorities = ['Low', 'Medium', 'High', 'Urgent'];
    return priorities[Math.floor(Math.random() * priorities.length)];
}

/**
 * Random project priority.
 * Must match Project model enum: ["Low", "Medium", "High", "Critical"]
 */
export function randomProjectPriority() {
    var priorities = ['Low', 'Medium', 'High', 'Critical'];
    return priorities[Math.floor(Math.random() * priorities.length)];
}

/**
 * Cycle through task statuses deterministically (for idempotent updates).
 * Must match Task model enum: ["To-Do", "In-Progress", "Review", "Done"]
 */
export function cycleTaskStatus(iteration) {
    var statuses = ['To-Do', 'In-Progress', 'Review', 'Done'];
    return statuses[iteration % statuses.length];
}

/**
 * Pick a random element from an array.
 */
export function randomItem(arr) {
    if (!arr || arr.length === 0) { return null; }
    return arr[Math.floor(Math.random() * arr.length)];
}
