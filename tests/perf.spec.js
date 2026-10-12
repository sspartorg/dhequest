// Speed budgets. Phones and tablets run with the CPU slowed 4x (Chromium only) to stand in for a mid-range device.
const { test, expect } = require('@playwright/test');
const { scrollFrameTimes } = require('./helpers');

// First-load budget is higher than a typical page: the scroll-driven story stacks eight full screenshots, and Chrome
// fetches them on load because they sit within its read-ahead distance (desktop measured 478 KB in Oct 2026).
// Loading the story screens on demand would bring desktop down by about 250 KB.
// Largest paint is also higher: on a phone held sideways (CPU slowed 4x) the hero screenshot, its floating cards and
// the logo compete as the largest element and it lands at 1.4-3.2 s (Oct 2026). Painting the hero screenshot without
// waiting for the setup script would bring this under 2.5 s, as it did on sspart-enterprise.com.
const BUDGET = { firstLoadKB: 550, requests: 30, layoutShift: 0.1, largestPaintMs: 3500, scrollMedianMs: 20 };

test('first load stays light, fast and stable', async ({ page, isMobile }) => {
  if (isMobile) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    return { kb: res.reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0) / 1024, requests: res.length, lcp: window.__lcp, cls: window.__cls };
  });
  test.info().annotations.push({ type: 'first load', description: `${Math.round(m.kb)} KB, ${m.requests} requests, LCP ${Math.round(m.lcp)} ms, CLS ${m.cls.toFixed(3)}` });
  expect(m.kb, 'KB downloaded on first load').toBeLessThanOrEqual(BUDGET.firstLoadKB);
  expect(m.requests, 'requests on first load').toBeLessThanOrEqual(BUDGET.requests);
  expect(m.cls, 'layout shift').toBeLessThanOrEqual(BUDGET.layoutShift);
  expect(m.lcp, 'largest paint (ms)').toBeLessThanOrEqual(BUDGET.largestPaintMs);
});

test('scrolling holds about 60 fps', async ({ page, isMobile }) => {
  if (isMobile) await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const f = await scrollFrameTimes(page);
  test.info().annotations.push({ type: 'scroll', description: `median ${f.median.toFixed(1)} ms, p95 ${f.p95.toFixed(1)} ms per frame` });
  expect(f.median, 'median frame time while scrolling (ms)').toBeLessThanOrEqual(BUDGET.scrollMedianMs);
});
