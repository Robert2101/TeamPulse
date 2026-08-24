import { Counter, Rate, Trend } from 'k6/metrics';

// ── Overall success / failure ────────────────────────────────────────────────
export const successfulRequests = new Counter('tp_successful_requests');
export const failedRequests     = new Counter('tp_failed_requests');
export const businessSuccessRate = new Rate('tp_business_success_rate');

// ── Read endpoint latency (per-endpoint Trends, values in ms) ────────────────
export const checkAuthDuration      = new Trend('tp_check_auth_duration',      true);
export const projectsListDuration   = new Trend('tp_projects_list_duration',   true);
export const projectDetailDuration  = new Trend('tp_project_detail_duration',  true);
export const tasksByProjectDuration = new Trend('tp_tasks_by_project_duration', true);
export const dashboardStatsDuration = new Trend('tp_dashboard_stats_duration', true);
export const myTasksDuration        = new Trend('tp_my_tasks_duration',        true);
export const commentsByTaskDuration = new Trend('tp_comments_by_task_duration', true);
export const activityLogsDuration   = new Trend('tp_activity_logs_duration',   true);
export const workspaceUsersDuration = new Trend('tp_workspace_users_duration', true);
export const chatHistoryDuration    = new Trend('tp_chat_history_duration',    true);
export const filesByEntityDuration  = new Trend('tp_files_by_entity_duration', true);

// ── Write endpoint latency ───────────────────────────────────────────────────
export const createProjectDuration  = new Trend('tp_create_project_duration',  true);
export const updateTaskDuration     = new Trend('tp_update_task_duration',     true);
export const createCommentDuration  = new Trend('tp_create_comment_duration',  true);

// ── Cache-specific aggregate ─────────────────────────────────────────────────
// Records latency for all Redis-backed read endpoints so you can compare
// Redis ON vs Redis OFF in a single metric.
export const cacheReadDuration = new Trend('tp_cache_read_duration', true);
