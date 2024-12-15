import dotenv from "dotenv";
import puppeteer, { Browser } from "puppeteer";
import { runCommand } from "./test-utils";

dotenv.config();

jest.setTimeout(1000 * 60 * 5); // 5 minutes
describe("Zitadel OAuth2 Integration", () => {
  let _stopServer: (() => void) | null = null;
  let _serverResult: Promise<string | null> | null = null;
  let _browser: Browser | null = null;

  beforeAll(async () => {
    const { result: buildResult } = runCommand("pnpm", ["dev:build"]);
    if ((await buildResult) === null) {
      throw "Build failed";
    } else {
      console.info("Build successful");
    }
    const { result: serverResult, stop: stopServer } = runCommand("pnpm", [
      "dev:start",
    ]);
    // wait for 30s
    let serverStarted = false;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch("http://localhost:3000/admin");
        if (res.status === 200) {
          serverStarted = true;
          console.info("Server started");
          break;
        }
      } catch (e) {
        console.info("Waiting for server to start...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!serverStarted) {
      throw "Server did not start after 30s";
    }
    _stopServer = stopServer;
    _serverResult = serverResult;

    const HEADLESS = process.env.HEADLESS?.toLowerCase() === "true";
    _browser = await puppeteer.launch({ headless: HEADLESS });
    console.info("Browser started");
  });

  it("Should work as expected", async () => {
    const ZITADEL_TEST_EMAIL = process.env.ZITADEL_TEST_EMAIL;
    if (typeof ZITADEL_TEST_EMAIL !== "string") {
      throw "ZITADEL_TEST_EMAIL not set";
    }
    const ZITADEL_TEST_PASSWORD = process.env.ZITADEL_TEST_PASSWORD;
    if (typeof ZITADEL_TEST_PASSWORD !== "string") {
      throw "ZITADEL_TEST_PASSWORD not set";
    }
    if (typeof _browser === null) {
      throw "Browser not initialized";
    }
    const browser = _browser as Browser;
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/api/users/oauth/zitadel");
    console.info("Navigated to Google OAuth");

    // Log in with Zitadel credentials
    await page.waitForSelector("#loginName", { visible: true });
    await page.type("#loginName", ZITADEL_TEST_EMAIL);
    await page.click("#submit-button");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.info("Email entered");

    await page.waitForSelector("#password", { visible: true });
    await page.type("#password", ZITADEL_TEST_PASSWORD);
    await page.click("#submit-button");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.info("Password entered");

    // Check for successful login by checking 200 response from /api/users/me
    const response = await fetch("http://localhost:3000/api/users/me");
    expect(response.status).toBe(200);
    console.info("Logged in successfully");

    // logout by wiping cookies
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      await browser.deleteCookie(cookie);
    }
    console.info("Cookies deleted");
  });

  afterAll(async () => {
    _stopServer?.();
    try {
      await _serverResult;
      console.info("Server stopped");
    } catch (e) {
      console.error(e);
    }
    await _browser?.close();
    console.info("Browser closed");
  });
});
