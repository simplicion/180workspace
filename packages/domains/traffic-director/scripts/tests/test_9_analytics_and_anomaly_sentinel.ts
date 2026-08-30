import assert from 'assert';

console.log('--- TEST SUITE 9: Traffic Analytics & Real-Time Anomaly Sentinel ---');

// Simulated Analytics Aggregation Function (Pure calculation logic verification)
function computeOverviewStats(params: {
  totalLogs: number;
  botCount: number;
  humanCount: number;
  datacenterCount: number;
}) {
  const { totalLogs, botCount, humanCount, datacenterCount } = params;
  const botRatio = totalLogs > 0 ? Math.round((botCount / totalLogs) * 100) : 0;
  const datacenterRatio = totalLogs > 0 ? Math.round((datacenterCount / totalLogs) * 100) : 0;

  // Anomaly Detection: Flag if datacenter/bot traffic surges above 60% with at least 20 logs
  const anomalyDetected = totalLogs >= 20 && (botRatio > 60 || datacenterRatio > 50);
  const anomalyMessage = anomalyDetected
    ? `Traffic Anomaly Alert: ${botRatio}% of recent traffic originates from automated bots / datacenter ASNs.`
    : null;

  return {
    totalRequests: totalLogs,
    totalHumans: humanCount,
    totalBots: botCount,
    totalDatacenter: datacenterCount,
    botRatio,
    datacenterRatio,
    anomalyDetected,
    anomalyMessage
  };
}

// 1. Normal traffic profile (85% human, 15% crawler, 10% datacenter)
const normalStats = computeOverviewStats({
  totalLogs: 100,
  botCount: 15,
  humanCount: 85,
  datacenterCount: 10
});

assert.strictEqual(normalStats.botRatio, 15);
assert.strictEqual(normalStats.datacenterRatio, 10);
assert.strictEqual(normalStats.anomalyDetected, false, 'Normal traffic should not trigger anomaly alert');
assert.strictEqual(normalStats.anomalyMessage, null);
console.log('✓ Test 9.1: Normal traffic ratio metrics computed accurately.');

// 2. High bot surge traffic profile (70% bot crawlers)
const botSurgeStats = computeOverviewStats({
  totalLogs: 100,
  botCount: 70,
  humanCount: 30,
  datacenterCount: 20
});

assert.strictEqual(botSurgeStats.botRatio, 70);
assert.strictEqual(botSurgeStats.anomalyDetected, true, 'Bot surge > 60% must trigger anomaly alert');
assert.ok(botSurgeStats.anomalyMessage?.includes('70%'), 'Anomaly message must describe exact bot percentage');
console.log('✓ Test 9.2: Bot traffic surge triggers Anomaly Sentinel alert.');

// 3. Datacenter scraper surge profile (55% datacenter ASNs)
const datacenterSurgeStats = computeOverviewStats({
  totalLogs: 100,
  botCount: 40,
  humanCount: 60,
  datacenterCount: 55
});

assert.strictEqual(datacenterSurgeStats.datacenterRatio, 55);
assert.strictEqual(datacenterSurgeStats.anomalyDetected, true, 'Datacenter ratio > 50% must trigger anomaly alert');
console.log('✓ Test 9.3: Cloud datacenter ASN surge triggers Anomaly Sentinel alert.');

// 4. Low sample size guard (< 20 total logs should not false-positive alert)
const smallSampleStats = computeOverviewStats({
  totalLogs: 5,
  botCount: 4,
  humanCount: 1,
  datacenterCount: 4
});

assert.strictEqual(smallSampleStats.anomalyDetected, false, 'Small sample size under 20 requests must not false positive alert');
console.log('✓ Test 9.4: Minimum sample size guard prevents false-positive alerts.');

console.log('>>> TEST SUITE 9 ALL PASSED! <<<\n');
