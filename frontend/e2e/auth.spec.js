import { test, expect } from "@playwright/test";
import { emailOf, openDemoAs, signIn, signOut } from "./helpers.js";

test("the landing page opens a private demo workspace in one click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("button", { name: "Explore the demo" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: /Maya/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Maya Chen/ })).toBeVisible(); // the persona switcher
});

test("a wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emailOf("lucas"));
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid credentials");
});

test("signing out ends the session", async ({ page }) => {
    await signIn(page, "lucas");
    await signOut(page);
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
});

test("the demo buttons sign in for real, and the top bar switches account", async ({ page }) => {
    await openDemoAs(page, "Maya Chen", "Admin");
    await page.getByRole("button", { name: /Signed in as Maya Chen/ }).click();
    await page.getByRole("menuitem", { name: /Grace Liu/ }).click();
    await expect(page.getByRole("button", { name: /Signed in as Grace Liu, Stakeholder/ })).toBeVisible();

    await signOut(page);
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
});
