import { test, expect, type Page } from "@playwright/test";
import playwright from "playwright";

test("smoke test", async () => {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:5173/");
    await expect(page).toHaveTitle(/Kanshape/);
    await browser.close();
});