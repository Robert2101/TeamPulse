import { test, expect } from "@playwright/test";
import { openProject, signInAs } from "./helpers.js";

test.beforeEach(async ({ page }) => {
    await signInAs(page, "Peter Parker");
    await openProject(page, "Mark 85 Armor Refinement");
});

test("a member moves a task and the change survives a reload", async ({ page }) => {
    await page.getByRole("button", { name: /^Nanobot storage algorithm/ }).click();
    const panel = page.getByRole("dialog");
    await expect(page).toHaveURL(/\?task=/);
    await panel.getByLabel("Status").selectOption("Review");
    await expect(page.getByRole("region", { name: /^Review/ }).getByText("Nanobot storage algorithm")).toBeVisible();

    await page.reload(); // the task link reopens the same task
    await expect(page.getByRole("dialog").getByLabel("Status")).toHaveValue("Review");
});

test("comments appear in the thread and on the card count", async ({ page }) => {
    await page.getByRole("button", { name: /^HUD layout for combat mode/ }).click();
    const panel = page.getByRole("dialog");
    await panel.getByPlaceholder(/Write a comment/).fill("Starting on the readout grouping today.");
    await panel.getByRole("button", { name: "Send comment" }).click();
    await expect(panel.getByText("Starting on the readout grouping today.")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /^HUD layout for combat mode.*2 comments/ })).toBeVisible();
});

test("members can't edit task details", async ({ page }) => {
    await page.getByRole("button", { name: /^HUD layout for combat mode/ }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByLabel("Status")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Edit description" })).toHaveCount(0);
    await expect(panel.getByRole("heading", { level: 2 }).getByRole("button")).toHaveCount(0); // title isn't editable
    await expect(panel.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
});

test("the filter narrows the board", async ({ page }) => {
    await page.getByPlaceholder("Filter by title or description").fill("thruster");
    await expect(page.getByRole("button", { name: /^Thruster output test/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^HUD layout for combat mode/ })).toHaveCount(0);
});
