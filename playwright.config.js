const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8877",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "python3 build_web_version.py && python3 -m http.server 8877 --directory web",
    url: "http://127.0.0.1:8877",
    reuseExistingServer: !process.env.CI,
  },
});