import { test, expect } from "@playwright/test";
import { signInAs } from "./helpers.js";

test("the landing page opens the demo workspace in one click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("button", { name: "Explore the demo" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Workspace overview" })).toBeVisible();
});

test("a wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("peter@stark.com");
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid credentials");
});

test("signing out ends the session", async ({ page }) => {
    await signInAs(page, "Peter Parker");
    await page.getByRole("button", { name: "Log out" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /log out/i }).click();
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
});
