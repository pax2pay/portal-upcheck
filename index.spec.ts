import { ProviderCode } from "@pax2pay/client"
import dotenv from "dotenv"
import * as puppeteer from "puppeteer"
dotenv.config()
jest.setTimeout(60000)
describe("Create a card", () => {
	async function createCard(provider: ProviderCode) {
		const url = "https://qa.pax2pay.com/login"
		const browser = await puppeteer.launch({ headless: false, devtools: false, slowMo: 30 })
		try {
			const page = await browser.newPage()
			page.setViewport({ width: 1920, height: 1080 })
			page.on("response", async response => {
				try {
					if (
						response.request().method() === "POST" &&
						response.url().endsWith("login") &&
						response.headers()["content-type"].includes("application/json")
					) {
						if (response.status() == 200)
							console.log("trackingId", (await response.json())?.trackingId)
						else {
							await page.close()
							throw new Error("Failed to login")
						}
					}
					if (
						response.request().method() === "POST" &&
						response.url().endsWith("/virtual/tokenised") &&
						response.headers()["content-type"].includes("application/json")
					) {
						if (response.status() != 201) {
							await page.close()
							throw new Error("Failed to create a card")
						}
					}
				} catch (error) {
					console.error(error.message)
					console.log(error)
				}
			})
			await page.goto(url)
			const usernameSelector = "#username input.sc-smoothly-input"
			await page.waitForSelector(usernameSelector, { timeout: 60000 })
			await page.type(usernameSelector, process.env.username ?? "")
			const passwordSelector = "#password input.sc-smoothly-input"
			await page.waitForSelector(passwordSelector, { timeout: 60000 })
			await page.type(passwordSelector, process.env.password ?? "")
			const loginButtonSelector = "#loginBtn button"
			await page.waitForSelector(loginButtonSelector, { timeout: 60000 })
			await page.click(loginButtonSelector)
			await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 })
			const paymentRoom = "li.sc-p2p-portal:nth-child(1) > a[href='/payment']"
			await page.waitForSelector(paymentRoom, { timeout: 60000 })
			await page.click(paymentRoom)
			const createCardButton = "#createCardBtn"
			await page.waitForSelector(createCardButton, { timeout: 60000 })
			await page.click(createCardButton)
			const accountSelector = "#createCardForm #accountSelector > smoothly-selector"
			await page.waitForSelector(accountSelector, { timeout: 60000 })
			await page.click(accountSelector)
			const selectedAccount = `#createCardForm #accountSelector > smoothly-selector> div > nav > smoothly-item:nth-child(1 of .${provider})`
			await page.waitForSelector(selectedAccount, { timeout: 60000 })
			await page.click(selectedAccount)
			const cardTypeSelector = "#createCardForm #cardTypeSelector > smoothly-selector"
			await page.waitForSelector(cardTypeSelector, { timeout: 60000 })
			await page.click(cardTypeSelector)
			const firstActiveCardType =
				"#createCardForm #cardTypeSelector > smoothly-selector > div > nav > smoothly-item:nth-child(1 of .active)"
			await page.waitForSelector(firstActiveCardType, { timeout: 60000 })
			await page.click(firstActiveCardType)
			await page.type("#createCardForm #balance > div > input", "69")
			const invoiceTab = "#invoiceMetadata"
			await page.waitForSelector(invoiceTab, { timeout: 60000 })
			await page.click(invoiceTab)
			const submitButton = "#createCardForm #submitBtn"
			await page.waitForSelector(submitButton, { timeout: 60000 })
			await page.click(submitButton)
			await page.waitForSelector("#csc", { timeout: 60000 })
			const elementHandler = await page.$("#csc")
			const frame = await elementHandler?.contentFrame()
			await frame?.waitForSelector("input.sc-smoothly-input", { timeout: 60000 })
			const csc = await frame?.$eval("input.sc-smoothly-input", (el: any) => el.value)
			expect(csc).toMatch(/^\d{3}$/)
		} catch (error) {
			console.error(error.message)
			console.log(error)
			await browser.close()
			throw error
		} finally {
			await browser.close()
		}
	}
	it("should create a modulr card", async function () {
		await createCard("modulr")
	}, 60000)
	it("should create a pax2pay card", async function () {
		await createCard("pax2pay")
	}, 60000)
})
