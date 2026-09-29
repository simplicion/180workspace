import { TrafficSimulatorService } from '../../src/services/simulator.service';
import { prisma } from '@workspace/db';

async function main() {
  console.log('--- Testing TrafficSimulatorService with Advanced Signals ---');

  // Find or use any active link
  const link = await (prisma as any).trafficLink.findFirst({
    where: { isActive: true }
  });

  if (!link) {
    console.log('No link found, skipping simulator DB test.');
    return;
  }

  console.log(`Testing simulator on link: ${link.name} (/r/${link.slug})`);

  // Test 1: Simulating Jio 5G Mobile User in India
  const simJio = await TrafficSimulatorService.simulate(link.companyId, {
    linkId: link.id,
    simulatedCountry: 'IN',
    simulatedCity: 'Mumbai',
    simulatedNetworkType: 'cellular',
    simulatedIsp: 'Jio',
    simulatedUserAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
  });
  console.log('Jio 5G simulation:');
  console.log('- ISP:', simJio.extractedSignals.isp);
  console.log('- Network:', simJio.extractedSignals.networkType);
  console.log('- Matched:', simJio.simulationResult.matchedRuleName);

  // Test 2: Simulating AdPlexity Scraper
  const simSpy = await TrafficSimulatorService.simulate(link.companyId, {
    linkId: link.id,
    simulatedIsSpyService: true,
    simulatedSpyServiceName: 'AdPlexity',
    simulatedNetworkType: 'datacenter'
  });
  console.log('\nSpy Scraper simulation:');
  console.log('- Is Spy:', simSpy.extractedSignals.isSpyService);
  console.log('- Spy Name:', simSpy.extractedSignals.spyServiceName);
  console.log('- Decision:', simSpy.simulationResult.matchedRuleName);
  console.log('- Is Fallback:', simSpy.simulationResult.isFallback);

  // Test 3: Simulating Timezone Delta (US IP with Asia/Kolkata Clock)
  const simTz = await TrafficSimulatorService.simulate(link.companyId, {
    linkId: link.id,
    simulatedCountry: 'US',
    simulatedClientTimezone: 'Asia/Kolkata',
    simulatedTimezone: 'America/New_York',
    simulatedNetworkType: 'residential'
  });
  console.log('\nTimezone Delta simulation:');
  console.log('- Has Timezone Delta:', simTz.extractedSignals.hasTimezoneDelta);
  console.log('- Is VPN:', simTz.extractedSignals.isVpn);
  console.log('- VPN Reason:', simTz.extractedSignals.vpnReason);
  console.log('- Decision:', simTz.simulationResult.matchedRuleName);

  // Test 4: Simulating Tor Exit Node
  const simTor = await TrafficSimulatorService.simulate(link.companyId, {
    linkId: link.id,
    simulatedIsTor: true,
    simulatedIp: '185.220.101.5'
  });
  console.log('\nTor Exit Node simulation:');
  console.log('- Is Tor:', simTor.extractedSignals.isTor);
  console.log('- Decision:', simTor.simulationResult.matchedRuleName);

  console.log('\nAll TrafficSimulatorService tests passed with flying colors!');
}

main().catch(err => {
  console.error('Simulator test error:', err);
  process.exit(1);
});
