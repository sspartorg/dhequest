// Slow connections on a phone (CPU slowed 4x): the headline and the largest picture appear within budget.
const { test, expect } = require('@playwright/test');

const NETWORKS = [
  { name: 'Slow 4G', downMbps: 1.6, upMbps: 0.75, rttMs: 150, headlineMs: 2500, largestMs: 4000 },
  { name: 'Fast 3G', downMbps: 1.44, upMbps: 0.675, rttMs: 563, headlineMs: 3500, largestMs: 6000 },
];

for (const net of NETWORKS) {
  test(`${net.name}: headline and main picture arrive in time`, async ({ page }) => {
    await page.route(/youtube-nocookie\.com|i\.ytimg\.com/, route => route.fulfill({ status: 200, body: '' }));
    // Warm-up visit at full speed, so the first measured run is not paying for a cold browser and server
    await page.goto('/', { waitUntil: 'load' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.rttMs, downloadThroughput: net.downMbps * 125000, uploadThroughput: net.upMbps * 125000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // The browser's own paint timings: polling the page would measure when the busy main thread frees up
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await page.waitForTimeout(800);
    const { headline, largest, what } = await page.evaluate(() => ({
      headline: Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime),
      largest: Math.round(window.__lcp),
      what: (performance.getEntriesByType('largest-contentful-paint').pop()?.element?.tagName || '?'),
    }));
    test.info().annotations.push({ type: net.name, description: `headline ${headline} ms, largest paint ${largest} ms (${what})` });
    expect(headline, 'headline readable (ms)').toBeLessThanOrEqual(net.headlineMs);
    expect(largest, 'largest picture shown (ms)').toBeLessThanOrEqual(net.largestMs);
  });
}
