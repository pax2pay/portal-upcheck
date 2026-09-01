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

			const loginResponse = page.waitForResponse(
				response => response.request().method() === "POST" && response.url().endsWith("login")
			)
			const loginButtonSelector = "#login-button"
			await click(page, loginButtonSelector)
			const waited = await loginResponse
			assertResponseHasHttpCode(waited, 200)
			console.log(`trackingId (${provider}): `, (await waited.json())?.trackingId)

			const paymentRoom = "#payment-room-link > li:nth-child(1) > a:nth-child(1)"
			await click(page, paymentRoom)
			// give it a bit of time to grab all the accounts
			await new Promise(resolve => setTimeout(resolve, 5000))

			const createPaymentButton = "smoothly-button.create-payment-button"
			await click(page, createPaymentButton)

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
			// registered before the click: submission and the CDE display load both resolve fast enough
			// that attaching these listeners afterwards can miss them entirely
			const paymentCreated = page.waitForResponse(
				response => response.request().method() === "POST" && response.url().endsWith("/payments/tokenised")
			)
			// host-agnostic: the CDE domain varies by environment (e.g. cde.pax2pay.qa vs cde.pax2pay.com)
			const cdeDisplayed = page.waitForResponse(
				response => response.request().method() === "GET" && response.url().includes("/display/")
			)
			const submitButton = "p2p-payment-create .actions smoothly-button:nth-child(2) button"
			await click(page, submitButton)

			// unlike the card endpoint (which returns 201 Created), PaymentRestController answers every
			// POST, including this one, with 200 OK
			assertResponseHasHttpCode(await paymentCreated, 200)
			assertResponseHasHttpCode(await cdeDisplayed, 200)

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

	// Locator.click's actionability polling (bounding box, "is this the same stable element") keeps
	// re-checking after the click too, and every one of these clicks triggers a re-render (a panel
	// opening, an item's dropdown unmounting, a submit) that can make it spuriously time out even
	// though the click already landed. Dispatching the click directly on the element sidesteps that.
	async function click(page: puppeteer.Page, selector: string) {
		const element = await page.waitForSelector(selector, { visible: true })
		await element?.evaluate((el: any) => el.click())
	}

	async function selectDropdownItem(page: puppeteer.Page, toggleSelector: string, itemSelector: string) {
		await click(page, toggleSelector)
		await click(page, itemSelector)
		// confirm the selection actually took via the "has-value" class the select adds once something
		// is selected, since the item click above can't be verified any other way once it unmounts
		await page.waitForSelector(`${toggleSelector}.has-value`, { timeout: 5000 })
	}
})
