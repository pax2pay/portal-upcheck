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
				await page.locator(usernameSelector).fill(process.env.username ?? "")
				const passwordSelector = "#password input.sc-smoothly-0-input, #password input.sc-smoothly-input"
				await page.locator(passwordSelector).fill(process.env.password ?? "")
				const loginButtonSelector = "#loginBtn button"
				await page.locator(loginButtonSelector).click()
				await page
					.waitForResponse(
						response =>
							response.request().method() === "POST" && response.url().endsWith("login") && response.status() === 200
					)
					.then(async response => console.log("trackingId", (await response.json())?.trackingId))
					.catch(async error => {
						throw new Error("Failed to login." + error)
					})
				await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(error => {
					throw new Error("Failed to fetch all card types. " + error)
				})
				const paymentRoom = "li.sc-p2p-portal:nth-child(1) > a[href='/payment']"
				await page.locator(paymentRoom).click()
				const createCardButton = "#createCardBtn"
				await page.locator(createCardButton).click()
				for (let i = 0; i < providers.length; i++) {
					const accountSelector = "#createCardForm #accountSelector > smoothly-input-select"
					await page.locator(accountSelector).click()
					const selectedAccount = `#createCardForm #accountSelector > smoothly-input-select> div > smoothly-item:nth-child(1 of .${providers[i]})`
					await page.locator(selectedAccount).click()
					const cardTypeSelector = "#createCardForm #cardTypeSelector > smoothly-input-select"
					await page.locator(cardTypeSelector).click()
					const firstActiveCardType =
						"#createCardForm #cardTypeSelector > smoothly-input-select > div > smoothly-item:nth-child(1 of .active)"
					await page.locator(firstActiveCardType).click()
					await page.locator("#createCardForm #balance > div > input").fill("69")
					const invoiceTab = "#invoiceMetadata"
					await page.locator(invoiceTab).click()
					const submitButton = "#createCardForm #submitBtn"
					await page.locator(submitButton).click()
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
					const elementHandler = await page.$("#csc")
					const frame = await elementHandler?.contentFrame()
					await frame?.locator("input.sc-smoothly-0-input, input.sc-smoothly-input")
					const csc = await frame?.$eval("input.sc-smoothly-0-input, input.sc-smoothly-input", (el: any) => el.value)
					expect(csc).toMatch(/^\d{3}$/)
					const backButton = "smoothly-0-button:nth-of-type(2) button"
					await page.locator(backButton).click()
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
