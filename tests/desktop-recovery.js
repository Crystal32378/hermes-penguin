// Playwright CLI run-code --filename tests/desktop-recovery.js
// Run only against a disposable browser harness serving the production component
// and /api/plugins/penguin routes. This injects one artwork outage, not user data.
async page => {
  const origin = new URL(page.url()).origin
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw Error('Use a loopback test harness')
  const pattern = '**/api/plugins/penguin/art/kit'
  let fail = true, requests = 0
  await page.route(pattern, async route => {
    requests++
    if (fail) await route.fulfill({status:503, contentType:'application/json', body:'{}'})
    else await route.continue()
  })
  try {
    await page.reload()
    await page.getByRole('button', {name:'Enter planner · 略過開場'}).click()
    await page.getByRole('heading', {name:'4 of 4 can fit the full meeting'}).waitFor()
    if (!requests) throw Error('Fault injection did not execute')
    const failedRequests = requests
    fail = false
    await page.getByRole('button', {name:'Replay arrival'}).click()
    await page.locator('.p-intro-art .p-bg').waitFor({timeout:2500})
    if (requests <= failedRequests) throw Error('Artwork failure was not retried')
    await page.getByRole('button', {name:'Enter planner · 略過開場'}).click()
    await page.locator('.p-dispatch-frame').waitFor()
    const recoveredRequests = requests
    await page.getByRole('button', {name:'Replay arrival'}).click()
    await page.locator('.p-intro-art .p-bg').waitFor()
    await page.getByRole('button', {name:'Enter planner · 略過開場'}).click()
    await page.locator('.p-dispatch-frame').waitFor()
    if (requests !== recoveredRequests) throw Error('Successful artwork was not cached')
    return {passed:['artwork outage falls back', 'replay retries after recovery', 'successful artwork is shared and cached'], requests}
  } finally {
    await page.unroute(pattern)
  }
}
