import { test, expect } from "@playwright/test";
import { openDemoAs } from "./helpers.js";

const horizontalOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test("the landing page fits a phone", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Stakeholder" }).click();
    await expect(page.getByText("View only.")).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("the navigation drawer works on a phone", async ({ page }) => {
    await openDemoAs(page, "Lucas Moreau", "Team Member");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "My Tasks", exact: true }).click(); // the drawer entry, not the overview link
    await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
