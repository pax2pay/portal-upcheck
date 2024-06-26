import { ProviderCode } from "@pax2pay/client"
import dotenv from "dotenv"
import * as puppeteer from "puppeteer"
dotenv.config()
jest.setTimeout(60000)
describe("Create a card", () => {
	async function createCard(providers: ProviderCode[]) {
		if (providers.length) {
			const url = "https://ui.pax2pay.qa"
			const browser = await puppeteer.launch({ headless: false, devtools: false, slowMo: 30 })
			const page = await browser.newPage()
			try {
				page.setViewport({ width: 1920, height: 1080 })
				await page
					.goto(`${url}/login`, {
						waitUntil: "networkidle2",
						timeout: 60000,
					})
					.catch(async error => {
						throw new Error("Failed to load login page." + error)
					})
				const usernameSelector = "#username input.sc-smoothly-0-input, #username input.sc-smoothly-input"
				await page.waitForSelector(usernameSelector, { timeout: 60000 })
				await page.type(usernameSelector, process.env.username ?? "")
				const passwordSelector = "#password input.sc-smoothly-0-input, #password input.sc-smoothly-input"
				await page.waitForSelector(passwordSelector, { timeout: 60000 })
				await page.type(passwordSelector, process.env.password ?? "")
				const loginButtonSelector = "#loginBtn button"
				await page.waitForSelector(loginButtonSelector, { timeout: 60000 })
				await page.click(loginButtonSelector)
				await page
					.waitForResponse(
						response =>
							response.request().method() === "POST" && response.url().endsWith("login") && response.status() === 200
					)
					.then(async response => console.log("trackingId", (await response.json())?.trackingId))
					.catch(async error => {
						throw new Error("Failed to login." + error)
					})
				await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 })
				const paymentRoom = "li.sc-p2p-portal:nth-child(1) > a[href='/payment']"
				await page.waitForSelector(paymentRoom, { timeout: 60000 })
				await page.click(paymentRoom)
				for (let i = 0; i < providers.length; i++) {
					const createCardButton = "#createCardBtn"
					await page.waitForSelector(createCardButton, { timeout: 60000 })
					await page.click(createCardButton)
					const accountSelector =
						"#createCardForm #accountSelector > smoothly-0-selector, #createCardForm #accountSelector > smoothly-selector"
					await page.waitForSelector(accountSelector, { timeout: 60000 })
					await page.click(accountSelector)
					const selectedAccount =
						`#createCardForm #accountSelector > smoothly-0-selector> div > nav > smoothly-0-item:nth-child(1 of .${providers[i]})` +
						`, #createCardForm #accountSelector > smoothly-selector> div > nav > smoothly-item:nth-child(1 of .${providers[i]})`
					await page.waitForSelector(selectedAccount, { timeout: 60000 })
					await page.click(selectedAccount)
					const cardTypeSelector =
						"#createCardForm #cardTypeSelector > smoothly-0-selector" +
						", #createCardForm #cardTypeSelector > smoothly-selector"
					await page.waitForSelector(cardTypeSelector, { timeout: 60000 })
					await page.click(cardTypeSelector)
					const firstActiveCardType =
						"#createCardForm #cardTypeSelector > smoothly-0-selector > div > nav > smoothly-0-item:nth-child(1 of .active)" +
						", #createCardForm #cardTypeSelector > smoothly-selector > div > nav > smoothly-item:nth-child(1 of .active)"
					await page.waitForSelector(firstActiveCardType, { timeout: 60000 })
					await page.click(firstActiveCardType)
					await page.type("#createCardForm #balance > div > input", "69")
					const invoiceTab = "#invoiceMetadata"
					await page.waitForSelector(invoiceTab, { timeout: 60000 })
					await page.click(invoiceTab)
					const submitButton = "#createCardForm #submitBtn"
					await page.waitForSelector(submitButton, { timeout: 60000 })
					await page.click(submitButton)
					await page
						.waitForResponse(
							response =>
								response.request().method() === "POST" &&
								response.url().endsWith("/virtual/tokenised") &&
								response.status() === 201
						)
						.catch(async error => {
							throw new Error("Failed to create a card." + error)
						})
					await page
						.waitForResponse(
							response =>
								response.request().method() === "GET" &&
								response.url().startsWith("https://cde.pax2pay.qa/display") &&
								response.status() === 200
						)
						.catch(async error => {
							throw new Error("Failed to display the card. " + error)
						})
					await page.waitForSelector("#csc")
					const elementHandler = await page.$("#csc")
					const frame = await elementHandler?.contentFrame()
					await frame?.waitForSelector("input.sc-smoothly-0-input, input.sc-smoothly-input", { timeout: 60000 })
					const csc = await frame?.$eval("input.sc-smoothly-0-input, input.sc-smoothly-input", (el: any) => el.value)
					expect(csc).toMatch(/^\d{3}$/)
					await page.goto(`${url}/payment`, {
						waitUntil: "networkidle0",
						timeout: 60000,
					})
				}
			} catch (error) {
				const screenshot = await page.screenshot({ encoding: "base64" })
				console.error("screenshot:", screenshot)
				console.error(error.message)
			} finally {
				await browser.close()
			}
		}
	}
	it("should create a card", async function () {
		await createCard(["modulr", "pax2pay"])
	}, 60000)
})
