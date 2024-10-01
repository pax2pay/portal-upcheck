import { ProviderCode } from "@pax2pay/client"
import dotenv from "dotenv"
import * as puppeteer from "puppeteer"
dotenv.config()
jest.setTimeout(60000)
describe("Create a card", () => {
	async function createCard(provider: ProviderCode) {
		const url = "https://qa.pax2pay.com"
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
					throw error
				})

			const usernameSelector = "#username input.sc-smoothly-0-input, #username input.sc-smoothly-input"
			await page.locator(usernameSelector).fill(process.env.username ?? "")
			const passwordSelector = "#password input.sc-smoothly-0-input, #password input.sc-smoothly-input"
			await page.locator(passwordSelector).fill(process.env.password ?? "")
			const loginButtonSelector = "#loginBtn button"
			await page.locator(loginButtonSelector).click()

			await page
				.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("login"))
				.then(async response => {
					const waited = await response
					assertResponseHasHttpCode(waited, 200)
					console.log(`trackingId (${provider}): `, (await waited.json())?.trackingId)
				})
				.catch(async error => {
					throw error
				})

			// give it a bit of time to grab all the cards
			await new Promise(resolve => setTimeout(resolve, 5000))

			const paymentRoom = "#payment-room-link > li:nth-child(1) > a:nth-child(1)"
			await page.locator(paymentRoom).click()

			const createCardButton = "#createCardBtn"
			await page.locator(createCardButton).click()

			// pick an account
			const accountSelector = "#createCardForm #accountSelector > smoothly-input-select"
			await page.locator(accountSelector).click()
			const selectedAccount = `#createCardForm #accountSelector > smoothly-input-select> div > smoothly-item:nth-child(2 of .${provider})`
			await page.locator(selectedAccount).click()

			// pick a card type
			const cardTypeSelector = "#createCardForm #cardTypeSelector > smoothly-input-select"
			await page.locator(cardTypeSelector).click()
			const firstActiveCardType =
				"#createCardForm #cardTypeSelector > smoothly-input-select > div:nth-child(3) > smoothly-item:nth-child(1 of .active)"
			await page.locator(firstActiveCardType).click()

			// set a balance
			await page.locator("#createCardForm #balance > div > input").fill("69")

			// select invoice metadata type (no data needed for this)
			const invoiceTab = "#invoiceMetadata"
			await page.locator(invoiceTab).click()

			// create the card
			const submitButton = "#createCardForm #submitBtn"
			await page.locator(submitButton).click()

			await page
				.waitForResponse(
					response => response.request().method() === "POST" && response.url().endsWith("/virtual/tokenised")
				)
				.then(async response => assertResponseHasHttpCode(await response, 201))
				.catch(async error => {
					throw error
				})
			await page
				.waitForResponse(
					response =>
						response.request().method() === "GET" && response.url().startsWith("https://cde.pax2pay.qa/display")
				)
				.then(async response => assertResponseHasHttpCode(await response, 200))
				.catch(async error => {
					throw error
				})

			const elementHandler = await page.$("#csc")
			const frame = await elementHandler?.contentFrame()
			await frame?.locator("input.sc-smoothly-0-input, input.sc-smoothly-input")
			const csc = await frame?.$eval("input.sc-smoothly-0-input, input.sc-smoothly-input", (el: any) => el.value)
			expect(csc).toMatch(/^\d{3}$/)
		} catch (error) {
			const screenshot = await page.screenshot({ encoding: "base64" })
			console.error("screenshot:", screenshot)
			console.error(error.message)
			throw error
		} finally {
			await browser.close()
		}
	}

	it("modulr card", async function () {
		await createCard("modulr")
	}, 60000)
	it("pp card", async function () {
		await createCard("pax2pay")
	}, 60000)

	function assertResponseHasHttpCode(response: puppeteer.HTTPResponse, status: number): puppeteer.HTTPResponse {
		const actual = response.status()
		if (actual !== status) {
			throw new Error("Status expected " + status + ", actual " + actual)
		}
		return response
	}
})
