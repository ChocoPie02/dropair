(async () => {
  const chalk = (await import("chalk")).default;
  const moment = require("moment");
  const fs = require("fs").promises;
  const { chromium } = require("playwright");

  async function loadAuthToken() {
    try {
      const data = await fs.readFile("account.txt", "utf8");
      return data.split("\n").map((line) => line.trim());
    } catch (error) {
      console.error("Error loading auth-token:", error);
      return null;
    }
  }

  async function loadProxies() {
    try {
      const data = await fs.readFile("proxy.txt", "utf8");
      return data.split("\n").map((line) => line.trim());
    } catch (error) {
      console.log(chalk.yellow("Continuing without proxies"));
      return null;
    }
  }

  async function handleCloudflare(page) {
    try {
      await page.waitForSelector("#challenge-form", { timeout: 30000 });
      console.log(chalk.yellow("Cloudflare challenge detected"));
      await page.solveRecaptchas();
      await page.click('input[type="checkbox"]');
      await page.waitForNavigation();
    } catch (error) {
      console.log(chalk.green("No Cloudflare challenge detected"));
    }
  }

  async function executeDailyCheckIn(authToken, proxy) {
    const browser = await chromium.launch({
      headless: true,
      proxy: proxy ? { server: proxy } : undefined,
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Set User-Agent dan headers konsisten
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        "sec-ch-ua-platform": "Windows",
      });

      // Navigasi ke halaman utama
      await page.goto("https://dropair.io", {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      // Handle Cloudflare challenge
      await handleCloudflare(page);

      // Set auth-token cookie
      await context.addCookies([
        {
          name: "auth-token",
          value: authToken,
          domain: "dropair.io",
          path: "/",
        },
      ]);

      // Ambil data user
      const userResponse = await page.request.get(
        "https://dropair.io/api/user"
      );
      const userData = await userResponse.json();
      console.log(
        chalk.magenta(
          `User: ${userData.username} | Points: ${userData.totalPoints}`
        )
      );

      // Daily check-in
      const checkInResponse = await page.request.post(
        "https://dropair.io/api/tasks",
        {
          data: { taskId: "daily-task" },
        }
      );

      if (checkInResponse.status() === 400) {
        const error = await checkInResponse.json();
        console.log(chalk.red(`Error: ${error.error}`));
      } else {
        console.log(chalk.green("Check-in berhasil!"));
      }
    } finally {
      await browser.close();
    }
  }

  async function main() {
    const tokens = await loadAuthToken();
    const proxies = await loadProxies();

    while (true) {
      for (const [index, token] of tokens.entries()) {
        const proxy = proxies?.[index % proxies.length];
        console.log(chalk.blue(`\nProcessing account ${index + 1}`));

        try {
          await executeDailyCheckIn(token, proxy);
        } catch (error) {
          console.error(chalk.red(`Error: ${error.message}`));
        }
      }

      const nextRun = moment().add(24, "hours").format("DD MMMM YYYY HH:mm");
      console.log(chalk.yellow(`\nNext run: ${nextRun}`));
      await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
    }
  }

  main();
})();
