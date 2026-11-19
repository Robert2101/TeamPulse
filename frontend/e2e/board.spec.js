import { test, expect } from "@playwright/test";
import { card, openDemoAs, openProject, pick } from "./helpers.js";

// Lucas is a team member on Mobile app 3.0. Every test gets its own sandbox, so changes never leak between tests.
test.beforeEach(async ({ page }) => {
    await openDemoAs(page, "Lucas Moreau", "Team Member");
    await openProject(page, "Mobile app 3.0");
});

test("a member moves a task and the change survives a reload", async ({ page }) => {
    await card(page, "Crash when switching currency on Android").click();
    await expect(page).toHaveURL(/\?task=/);
    await pick(page, "Status", "Review");
    await expect(page.getByRole("region", { name: /^Review,/ }).getByText("Crash when switching currency on Android")).toBeVisible();

    await page.reload(); // the task link reopens the same task
    await expect(page.getByRole("dialog").getByRole("combobox", { name: "Status" })).toHaveText(/Review/);
});

test("comments appear in the thread and on the card count", async ({ page }) => {
    const task = card(page, "Offline trip timeline");
    const before = Number((await task.getAttribute("aria-label")).match(/(\d+) comments?/)?.[1] ?? 0);
    await task.click();
    const panel = page.getByRole("dialog");
    await panel.getByPlaceholder(/Write a comment/).fill("Cached the timeline for offline use, testing on a plane tomorrow.");
    await panel.getByRole("button", { name: "Send comment" }).click();
    await expect(panel.getByText("Cached the timeline for offline use")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(task).toHaveAttribute("aria-label", new RegExp(`${before + 1} comments?`));
});

test("members can't edit task details", async ({ page }) => {
    await card(page, "Offline trip timeline").click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("combobox", { name: "Status" })).toBeVisible();
    await expect(panel.getByRole("combobox", { name: "Priority" })).toHaveCount(0);
    await expect(panel.getByRole("button", { name: "Edit description" })).toHaveCount(0);
    await expect(panel.getByRole("heading", { level: 2 }).getByRole("button")).toHaveCount(0); // title isn't editable
    await expect(panel.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
});

test("the filter narrows the board", async ({ page }) => {
    await page.getByPlaceholder("Filter by title or description").fill("rebooking");
    await expect(card(page, "One-tap rebooking for cancelled flights")).toBeVisible();
    await expect(card(page, "Offline trip timeline")).toHaveCount(0);
});
