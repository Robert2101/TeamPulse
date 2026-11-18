import { expect } from "@playwright/test";

/** Signs in with one click through the demo picker on the sign-in page. */
export const signInAs = async (page, name) => {
    await page.goto("/login");
    await page.getByRole("button", { name: new RegExp(`Sign in as ${name}`) }).click();
    await expect(page).toHaveURL(/\/dashboard/);
};

export const openProject = async (page, name) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: new RegExp(name) }).first().click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
};
