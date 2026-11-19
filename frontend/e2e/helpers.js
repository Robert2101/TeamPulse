import { expect } from "@playwright/test";

// The seeded Fernway workspace (backend/seed.js): <key>@fernway.example, password123.
export const PASSWORD = "password123";
export const emailOf = (key) => `${key}@fernway.example`;

/** Signs in to the seeded workspace with an email and password. */
export const signIn = async (page, key) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emailOf(key));
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
};

/** Opens a private demo sandbox as one of the four personas. Each call gets a fresh copy of Fernway. */
export const openDemoAs = async (page, name, role) => {
    await page.goto("/login");
    await page.getByRole("button", { name: `Open the demo as ${name}, ${role}` }).click();
    await expect(page).toHaveURL(/\/dashboard/);
};

export const signOut = async (page) => {
    await page.getByRole("button", { name: "Log out" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^(Log out|Leave demo)$/ }).click();
    await expect(page).not.toHaveURL(/\/dashboard/);
};

export const openProject = async (page, name) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: new RegExp(name) }).first().click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
};

/** A board card, by the start of its accessible name (the task title). */
export const card = (page, title) => page.getByRole("button", { name: new RegExp(`^${title}\\.`) });

/** Picks a value in one of the task panel's chip pickers (Status, Priority, Assignee). */
export const pick = async (page, label, option) => {
    await page.getByRole("dialog").getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
};
