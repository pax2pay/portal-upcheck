import * as puppeteer from "puppeteer"

jest.setTimeout(30000)
describe("Create a default card", () => {
	it("should create a card", async function () {
		const url = "http://localhost:3333/login"
		const browser = await puppeteer.launch({ headless: false, devtools: false, slowMo: 20 })
		try {
			const page = await browser.newPage()
			page.setViewport({ width: 1920, height: 1080 })
			await page.goto(url)
			const usernameSelector = "#username input.sc-smoothly-input"
			await page.waitForSelector(usernameSelector, { timeout: 30000 })
			await page.type(usernameSelector, "mcom-sa")
			const passwordSelector = "#password input.sc-smoothly-input"
			await page.waitForSelector(passwordSelector, { timeout: 30000 })
			await page.type(passwordSelector, "Password69420")
			const loginButtonSelector = "#loginBtn button"
			await page.waitForSelector(loginButtonSelector, { timeout: 30000 })
			await page.click(loginButtonSelector)
			await page.waitForNavigation({ waitUntil: "networkidle0" })
			const paymentRoom = "li.sc-p2p-portal:nth-child(1) > a[href='/payment']"
			await page.waitForSelector(paymentRoom, { timeout: 30000 })
			await page.click(paymentRoom)
			const createCardButton = "#createCardBtn"
			await page.waitForSelector(createCardButton, { timeout: 30000 })
			await page.click(createCardButton)
			const accountSelector = "#createCardForm #accountSelector > smoothly-selector"
			await page.waitForSelector(accountSelector)
			await page.click(accountSelector)
			const firstAccount =
				"#createCardForm #accountSelector > smoothly-selector> div > nav > smoothly-item:nth-child(1)"
			await page.waitForSelector(firstAccount)
			await page.click(firstAccount)
			const cardTypeSelector = "#createCardForm #cardTypeSelector > smoothly-selector"
			await page.waitForSelector(cardTypeSelector)
			await page.click(cardTypeSelector)
			const firstActiveCardType =
				"#createCardForm #cardTypeSelector > smoothly-selector > div > nav > smoothly-item:nth-child(1 of .active)"
			await page.waitForSelector(firstActiveCardType)
			await page.click(firstActiveCardType)
			await page.type("#createCardForm #balance > div > input", "69")
			const invoiceTab = "#invoiceMetadata"
			await page.waitForSelector(invoiceTab)
			await page.click(invoiceTab)
			const submitButton = "#createCardForm #submitBtn"
			await page.waitForSelector(submitButton)
			await page.click(submitButton)
			await page.on("response", response => {
				if (
					response.request().method() === "POST" &&
					response.url() === `${url}/mpay2-service/v2/cards/virtual/tokenised`
				)
					expect(response.status()).toEqual(201)
			})
		} catch (error) {
			console.error(error.message)
			console.log(error)
			await browser.close()
			throw error
		} finally {
			await browser.close()
		}
	})
})
