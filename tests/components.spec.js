// DheQuest home page: every interactive component.
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  // Videos play from YouTube; keep tests off the network and independent of it
  await page.route(/youtube-nocookie\.com|i\.ytimg\.com/, route => route.fulfill({ status: 200, body: '' }));
  await page.goto('/');
  await page.waitForTimeout(400);
});

test('header turns solid once the hero is scrolled past', async ({ page }) => {
  await expect(page.locator('#nav')).not.toHaveClass(/solid/);
  await page.evaluate(() => scrollTo({ top: document.getElementById('hero').offsetHeight + 50, behavior: 'instant' }));
  await expect(page.locator('#nav')).toHaveClass(/solid/);
});

test('story: scrolling to each step shows its screen', async ({ page }) => {
  const beats = page.locator('.beat');
  const n = await beats.count();
  expect(n).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < n; i++) {
    await beats.nth(i).evaluate(b => b.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const frame = Number(await beats.nth(i).getAttribute('data-frame'));
    await expect(beats.nth(i)).toHaveClass(/\bon\b/);
    await expect(page.locator('.frames .shot').nth(frame)).toHaveClass(/\bon\b/);
  }
});

test('market tabs: clicking shows that panel only and stops auto-advance', async ({ page }) => {
  const tabs = page.locator('.tabs .tab');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).scrollIntoViewIfNeeded();
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
    const panel = await tabs.nth(i).getAttribute('aria-controls');
    await expect(page.locator(`#${panel}`)).toBeVisible();
    expect(await page.locator('.panel:not([hidden])').count(), 'only one panel showing').toBe(1);
  }
  await expect(page.locator('.tabs')).toHaveClass(/manual/);
});

test('market tabs: arrow keys move between tabs', async ({ page }) => {
  const tabs = page.locator('.tabs .tab');
  // Keyboard users reach the tabs with Tab; Safari does not move focus to a button on mouse click
  await tabs.first().scrollIntoViewIfNeeded();
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
});

test('market tabs: advance on their own while in view', async ({ page }) => {
  await page.locator('#markets').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const before = await page.locator('.tabs .tab[aria-selected="true"]').getAttribute('id');
  await expect.poll(() => page.locator('.tabs .tab[aria-selected="true"]').getAttribute('id'), { timeout: 12_000 }).not.toBe(before);
});

test('screenshots open full size and close by button, backdrop and Escape', async ({ page }) => {
  const box = page.locator('#lightbox');
  const zoom = page.locator('.zoom').filter({ visible: true }).first();
  await zoom.click();
  await expect(box).toHaveJSProperty('open', true);
  expect(await box.locator('img').evaluate(i => i.getAttribute('src'))).toBeTruthy();
  await box.locator('button[aria-label="Close"]').click();
  await expect(box).toHaveJSProperty('open', false);
  await zoom.click();
  await page.mouse.click(5, 5);
  await expect(box).toHaveJSProperty('open', false);
  await zoom.click();
  await page.keyboard.press('Escape');
  await expect(box).toHaveJSProperty('open', false);
});

test('videos: thumbnails load near the section and a click starts the player', async ({ page }) => {
  const first = page.locator('[data-yt]').first();
  expect(await first.evaluate(b => b.style.backgroundImage), 'no thumbnail before scrolling near').toBe('');
  await page.locator('#videos').scrollIntoViewIfNeeded();
  await expect.poll(() => first.evaluate(b => b.style.backgroundImage)).toContain('i.ytimg.com');
  const id = await first.getAttribute('data-yt');
  await first.click();
  await expect(page.locator(`#videos iframe[src*="${id}"]`)).toHaveCount(1);
});

test('broker marquee pauses while off screen', async ({ page }) => {
  const marquee = page.locator('.marquee');
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await expect(marquee).toHaveClass(/\boff\b/);
  await marquee.evaluate(m => m.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(marquee).not.toHaveClass(/\boff\b/);
});

test('walkthrough button emails the team and the footer shows this year', async ({ page }) => {
  const href = await page.locator('a.btn[href^="mailto:"]').first().getAttribute('href');
  expect(href).toMatch(/^mailto:[^?]+@[^?]+\?subject=/);
  await expect(page.locator('#year')).toHaveText(String(new Date().getFullYear()));
});
