import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers.js";

test("the navigation drawer works on a phone", async ({ page }) => {
    await signInAs(page, "Peter Parker");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "My Tasks" }).click();
    await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});
