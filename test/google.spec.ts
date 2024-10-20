import dotenv from "dotenv";
import puppeteer, { Browser } from "puppeteer";
import { runCommand } from "./test-utils";

dotenv.config();

jest.setTimeout(1000 * 60 * 5); // 5 minutes
describe("Google OAuth2 Integration", () => {
  let _stopServer: (() => void) | null = null;
  let _serverResult: Promise<string | null> | null = null;
  let _browser: Browser | null = null;

  beforeAll(async () => {
    const { result: buildResult } = runCommand("pnpm", ["dev:build"]);
    await buildResult;
    console.info("Build complete");
    const { result: serverResult, stop: stopServer } = runCommand("pnpm", [
      "dev:start",
    ]);
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch("http://localhost:3000/admin");
        if (res.status === 200) {
          console.info("Server started");
          break;
        }
      } catch (e) {
        console.info("Waiting for server to start...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    _stopServer = stopServer;
    _serverResult = serverResult;

    const HEADLESS = process.env.HEADLESS?.toLowerCase() === "true";
    _browser = await puppeteer.launch({ headless: HEADLESS });
    console.info("Browser started");
  });

  it("Should work as expected", async () => {
    const GOOGLE_TEST_EMAIL = process.env.GOOGLE_TEST_EMAIL;
    if (typeof GOOGLE_TEST_EMAIL !== "string") {
      throw "GOOGLE_TEST_EMAIL not set";
    }
    const GOOGLE_TEST_PASSWORD = process.env.GOOGLE_TEST_PASSWORD;
    if (typeof GOOGLE_TEST_PASSWORD !== "string") {
      throw "GOOGLE_TEST_PASSWORD not set";
    }
    if (typeof _browser === null) {
      throw "Browser not initialized";
    }
    const browser = _browser as Browser;
    const page = await browser.newPage();
    await page.goto("http://localhost:3000/api/users/oauth/google");
    console.info("Navigated to Google OAuth");

    // Log in with Google credentials
    await page.waitForSelector("input[type=email]", { visible: true });
    await page.type("input[type=email]", GOOGLE_TEST_EMAIL);
    await page.click("#identifierNext");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.info("Email entered");

    await page.waitForSelector("input[type=password]", { visible: true });
    await page.type("input[type=password]", GOOGLE_TEST_PASSWORD);
    await page.click("#passwordNext");
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.info("Password entered");

    // Handle any consent screens or prompts
    try {
      const buttons = await page.$$("button");
      let consentButtonClicked = false;
      for (const button of buttons) {
        const textHandle = await button.getProperty("innerText");
        const text = await textHandle.jsonValue();
        if (
          text &&
          (text.trim().toLowerCase() === "continue" ||
            text.trim().toLowerCase() === "accept")
        ) {
          await button.click();
          consentButtonClicked = true;
          await page.waitForNavigation({ waitUntil: "networkidle0" });
          console.info("Consent button clicked");
          break;
        }
      }
      if (!consentButtonClicked) {
        console.info(
          "No consent button with text 'Continue' or 'Accept' found.",
        );
      }
    } catch (e) {
      console.info("Error handling consent screen:", e);
    }

    // Check for successful login by checking 200 response from /api/users/me
    const response = await fetch("http://localhost:3000/api/users/me");
    expect(response.status).toBe(200);
    console.info("Logged in successfully");

    // logout by wiping cookies
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      await page.deleteCookie(cookie);
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
