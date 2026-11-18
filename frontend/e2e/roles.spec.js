import { test, expect } from "@playwright/test";
import { openProject, signInAs } from "./helpers.js";

test("a project manager can rename a task in place", async ({ page }) => {
    await signInAs(page, "Pepper Potts");
    await openProject(page, "Mark 85 Armor Refinement");
    await page.getByRole("button", { name: /^HUD layout for combat mode/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "HUD layout for combat mode" }).click();
    const title = page.getByLabel("Task title");
    await title.fill("HUD layout for combat and cruise");
    await title.press("Enter");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "HUD layout for combat and cruise" })).toBeVisible();
});

test("another company's admin sees none of Stark's projects", async ({ page }) => {
    await signInAs(page, "Bruce Wayne");
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: /Batcave Sonar Grid/ }).first()).toBeVisible();
    await expect(page.getByText("Mark 85 Armor Refinement")).toHaveCount(0);
});

test("people who join by invite code start as stakeholders who can't create work", async ({ page }) => {
    const email = `happy+${Date.now()}@stark.com`;
    await page.goto("/register");
    await page.getByLabel("Invite code").fill("STARKX");
    await page.getByLabel("Full name").fill("Happy Hogan");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Join workspace" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Stakeholder").first()).toBeVisible();
    await page.goto("/projects");
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);
});
