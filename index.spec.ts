import { ProviderCode } from "@pax2pay/client"
import dotenv from "dotenv"
import * as puppeteer from "puppeteer"
dotenv.config()

// Keys the tests cannot run without. A missing one should fail loudly with a clear message, not
// silently fall back to empty credentials and surface as a confusing failed login.
const requiredEnv = ["username", "password"]
const missingEnv = requiredEnv.filter(key => !process.env[key])
if (missingEnv.length > 0) {
	throw new Error(`Missing required environment variable(s): ${missingEnv.join(", ")}. Add them to your .env file.`)
}

jest.setTimeout(60000)
describe("Create a payment", () => {
	async function createPayment(provider: ProviderCode) {
		const url = "https://uat.pax2pay.com"
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

			const usernameSelector = "#username-input"
			await page.locator(usernameSelector).fill(process.env.username ?? "")
			const passwordSelector = "#password-input"
			await page.locator(passwordSelector).fill(process.env.password ?? "")
			const loginButtonSelector = "#login-button"
			await page.locator(loginButtonSelector).click()

			await page
				.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("login"))
				.then(async response => {
					const waited = response
					assertResponseHasHttpCode(waited, 200)
					console.log(`trackingId (${provider}): `, (await waited.json())?.trackingId)
				})
				.catch(error => {
					throw error
				})

			const paymentRoom = "#payment-room-link > li:nth-child(1) > a:nth-child(1)"
			await page.locator(paymentRoom).click()
			// give it a bit of time to grab all the accounts
			await new Promise(resolve => setTimeout(resolve, 5000))

			const createPaymentButton = "smoothly-button.create-payment-button"
			await page.locator(createPaymentButton).click()

			// the "Card" tab of the payment-create form is open by default, no need to select it

			// pick an account
			const accountSelector = "p2p-payment-create-card p2p-account-select > smoothly-input-select"
			const selectedAccount = `p2p-payment-create-card p2p-account-select > smoothly-input-select smoothly-item:nth-child(1 of .${provider})`
			await selectDropdownItem(page, accountSelector, selectedAccount)

			// pick a card type
			const cardTypeSelector = "p2p-payment-create-card p2p-card-type-select > smoothly-input-select"
			const firstActiveCardType =
				"p2p-payment-create-card p2p-card-type-select > smoothly-input-select smoothly-item:nth-child(1 of :not([disabled])"
			await selectDropdownItem(page, cardTypeSelector, firstActiveCardType)

			// set a balance
			await page.locator("p2p-payment-create-card #balance > div > input").fill("69")

			// leave the metadata section (p2p-payment-meta-customised) on its default tab, no data needed there

			// create the payment
			const submitButton = "p2p-payment-create .actions smoothly-button:nth-child(2) button"
			await page.locator(submitButton).click()

			await page
				.waitForResponse(
					response => response.request().method() === "POST" && response.url().endsWith("/payments/tokenised")
				)
				// unlike the card endpoint (which returns 201 Created), PaymentRestController answers every
				// POST, including this one, with 200 OK
				.then(response => assertResponseHasHttpCode(response, 200))
				.catch(error => {
					throw error
				})
			await page
				.waitForResponse(
					response =>
						response.request().method() === "GET" && response.url().startsWith("https://cde.pax2pay.qa/display")
				)
				.then(response => assertResponseHasHttpCode(response, 200))
				.catch(error => {
					throw error
				})

			const elementHandler = await page.$("#csc")
			const frame = await elementHandler?.contentFrame()
			await frame?.locator("input.sc-smoothly-input")
			const csc = await frame?.$eval("input.sc-smoothly-input", (el: any) => el.value)
			expect(csc).toMatch(/^\d{3}$/)
		} catch (error: any) {
			const screenshot = await page.screenshot({ encoding: "base64" })
			console.error("screenshot:", screenshot)
			console.error(error.message)
			throw error
		} finally {
			await browser.close()
		}
	}

	it("modulr payment", async function () {
		await createPayment("modulr")
	}, 60000)
	it("pp payment", async function () {
		await createPayment("pax2pay")
	}, 60000)

	function assertResponseHasHttpCode(response: puppeteer.HTTPResponse, status: number): puppeteer.HTTPResponse {
		const actual = response.status()
		if (actual !== status) {
			throw new Error("Status expected " + status + ", actual " + actual)
		}
		return response
	}

	// Selecting an item closes the smoothly-input-select's dropdown and unmounts the item, so
	// Locator/page.click's actionability polling (bounding box, "is this the same stable element")
	// either spuriously times out after the click already landed, or never fires the click at all.
	// Dispatching the click directly on the element sidesteps that polling entirely; the "has-value"
	// class the select adds once something is selected confirms it actually took.
	async function selectDropdownItem(page: puppeteer.Page, toggleSelector: string, itemSelector: string) {
		const toggle = await page.waitForSelector(toggleSelector)
		await toggle?.evaluate((element: any) => element.click())
		const item = await page.waitForSelector(itemSelector, { visible: true })
		await item?.evaluate((element: any) => element.click())
		await page.waitForSelector(`${toggleSelector}.has-value`, { timeout: 5000 })
	}
})
