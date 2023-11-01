import * as puppeteer from "puppeteer"

describe("Create a default card", () => {
	it("should create a card", async function () {
		const browser = await puppeteer.launch({ headless: true, devtools: false, slowMo: 50, executablePath: "/usr/bin/google-chrome-stable",
		args: ["--single-process"] })
		try {
			const page = await browser.newPage()
			page.setViewport({ width: 1920, height: 1080 })
			await page.goto("https://qa.pax2pay.com/login")
			await page.$$(
				"div.sc-p2p-login:nth-child(2) > smoothly-input:nth-child(2) > div:nth-child(1) > input:nth-child(1)"
			)
			await page.type(
				"div.sc-p2p-login:nth-child(2) > smoothly-input:nth-child(2) > div:nth-child(1) > input:nth-child(1)",
				"mcom-sa"
			)
			await page.type(
				"div.sc-p2p-login:nth-child(3) > smoothly-input:nth-child(2) > div:nth-child(1) > input:nth-child(1)",
				"Password69420"
			)
			await page.click("button", { clickCount: 1 })
			await page.waitForNavigation({
				waitUntil: "networkidle0",
			})
			await (await page.waitForSelector("li.sc-p2p-portal:nth-child(1) > a:nth-child(1)", { timeout: 30000 }))?.click()
			await (
				await page.waitForSelector(
					"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > div:nth-child(2) > smoothly-button"
				)
			)?.click()
			await (
				await page.waitForSelector(
					"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > p2p-notifier > p2p-card-create > main > form > section > div:nth-child(1) > p2p-account-selector > smoothly-selector"
				)
			)?.click()
			await (
				await page.waitForSelector(
					"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > p2p-notifier > p2p-card-create > main > form > section > div:nth-child(1) > p2p-account-selector > smoothly-selector > div > nav > smoothly-item:nth-child(1)"
				)
			)?.click()
			await page.type(
				"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > p2p-notifier > p2p-card-create > main > form > p2p-payment-schedule > main > smoothly-input > div > input",
				"69"
			)
			await (
				await page.waitForSelector(
					"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > p2p-notifier > p2p-card-create > main > form > p2p-payment-meta > smoothly-tab-switch > smoothly-tab:nth-child(3)"
				)
			)?.click()
			await (
				await page.waitForSelector(
					"body > smoothly-notifier > p2p-router > p2p-portal > smoothly-app > smoothly-notifier > main > smoothly-room > p2p-payment-view > p2p-card-view > p2p-card-table > p2p-notifier > p2p-card-create > main > form > aside > div:nth-child(2) > smoothly-submit"
				)
			)?.click()
		} catch (error) {
			// const page = await browser.pages()
			console.error(error.message)
			console.log(error)

			//await page.screenshot({ path: 'pax2payreportERROR.png', fullPage: true })
			// await browser.close();
			//await browser.close()
			throw error
		} finally {
			// await browser.close();
		}
	})
})
