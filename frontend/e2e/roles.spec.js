import { test, expect } from "@playwright/test";
import { card, openDemoAs, openProject, signIn, signOut } from "./helpers.js";

test("a project manager can rename a task in place", async ({ page }) => {
    await openDemoAs(page, "Daniel Okafor", "Project Manager");
    await openProject(page, "Mobile app 3.0");
    await card(page, "Push reminder before online check-in opens").click();
    await page.getByRole("dialog").getByRole("button", { name: "Push reminder before online check-in opens" }).click();
    const title = page.getByLabel("Task title");
    await title.fill("Push reminder when online check-in opens");
    await title.press("Enter");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Push reminder when online check-in opens" })).toBeVisible();
});

test("a stakeholder reads the board and joins the discussion, but can't move work", async ({ page }) => {
    await openDemoAs(page, "Grace Liu", "Stakeholder");
    await openProject(page, "Partner API");
    await card(page, "Booking webhooks for partners").click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("combobox", { name: "Status" })).toHaveCount(0);
    await expect(panel.getByPlaceholder(/Write a comment/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /Add task|New task/ })).toHaveCount(0);
});

test("another company's admin can't open Fernway's projects", async ({ page }) => {
    await signIn(page, "maya");
    await openProject(page, "Mobile app 3.0");
    const fernwayProject = new URL(page.url()).pathname;
    await signOut(page);

    const email = `owner+${Date.now()}@northwind.example`;
    await page.goto("/register");
    await page.getByRole("tab", { name: "Create a workspace" }).click();
    await page.getByLabel("Workspace or company name").fill("Northwind Studio");
    await page.getByLabel("Full name").fill("Ines Duarte");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(fernwayProject);
    await expect(page.getByRole("heading", { name: "Project not found" })).toBeVisible();
});

test("people who join by invite code start as stakeholders who can't create work", async ({ page }) => {
    await signIn(page, "maya");
    await page.goto("/settings");
    const inviteCode = (await page.locator('[aria-labelledby="invite-code-label"]').innerText()).trim();
    await signOut(page);

    const email = `noah+${Date.now()}@fernway.example`;
    await page.goto("/register");
    await page.getByLabel("Invite code").fill(inviteCode);
    await page.getByLabel("Full name").fill("Noah Fischer");
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
