import { prisma } from '@workspace/db';
import { ThreatIntelligenceService } from '../../src/services/threat-intelligence.service';
import { TorExitSyncService } from '../../src/services/tor-exit-sync.service';
import { DecisionEngine } from '../../src/evaluator/decision-engine';
import { SignalExtractor } from '../../src/evaluator/signal-extractor';

async function main() {
  console.log('--- 1. Testing TorExitSyncService ---');
  const torStats = TorExitSyncService.getStats();
  console.log('Tor initial stats:', torStats);
  console.log('Is 185.220.101.5 a Tor exit node?', TorExitSyncService.isTorExitNode('185.220.101.5'));
  console.log('Is 8.8.8.8 a Tor exit node?', TorExitSyncService.isTorExitNode('8.8.8.8'));

  console.log('\n--- 2. Testing ThreatIntelligenceService System Feeds ---');
  const feeds = ThreatIntelligenceService.getSystemFeeds('test-company');
  console.log('System feeds count:', feeds.length);
  for (const f of feeds) {
    console.log(`- ${f.name} (${f.key}): enabled=${f.isEnabled}, signatures=${f.signatureCount}`);
  }

  console.log('\n--- 3. Testing Threat Detection (Meta Dublin Reviewer Subnet) ---');
  const metaSignals = SignalExtractor.extract({
    headers: {
      'x-forwarded-for': '157.240.22.35', // Meta subnet
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  const metaThreat = ThreatIntelligenceService.checkThreat(metaSignals, 'test-company');
  console.log('Meta reviewer threat check:', metaThreat);

  console.log('\n--- 4. Testing Threat Detection (Spy Scraper PacketHub ASN 209242) ---');
  const spySignals = SignalExtractor.extract({
    headers: {
      'x-forwarded-for': '194.26.29.10',
      'cf-as-organization': 'PacketHub S.A. ASN 209242',
      'user-agent': 'AdPlexity-Intelligence-Scraper/2.4'
    }
  });
  const spyThreat = ThreatIntelligenceService.checkThreat(spySignals, 'test-company');
  console.log('Spy scraper threat check:', spyThreat);

  console.log('\n--- 5. Testing DecisionEngine Evaluation with Global Threat Defense ---');
  const evaluation = DecisionEngine.evaluate(
    {
      id: 'test-link',
      fallbackUrl: 'https://safepage.com',
      isActive: true,
      blockSpyServices: true,
      blockVpn: true,
      rules: [
        {
          id: 'rule-1',
          name: 'Target Route',
          destinationUrl: 'https://moneypage.com',
          actionType: 'redirect_302',
          isActive: true,
          priority: 0,
          conditions: []
        }
      ]
    },
    metaSignals
  );
  console.log('Decision outcome for Meta reviewer:');
  console.log('- Destination:', evaluation.destinationUrl);
  console.log('- Matched rule name:', evaluation.matchedRuleName);
  console.log('- Is fallback:', evaluation.isFallback);

  console.log('\n--- 6. Testing Custom Threat Entry ---');
  const customRule = ThreatIntelligenceService.addCustomEntry('test-company', {
    name: 'Block Rogue Subnet',
    type: 'cidr',
    value: '198.51.100.0/24',
    mode: 'blacklist',
    description: 'Known competitor scraper'
  });
  console.log('Created custom threat rule:', customRule);

  const customSignals = SignalExtractor.extract({
    headers: {
      'x-forwarded-for': '198.51.100.42',
      'user-agent': 'Mozilla/5.0'
    }
  });
  const customThreat = ThreatIntelligenceService.checkThreat(customSignals, 'test-company');
  console.log('Custom threat check for 198.51.100.42:', customThreat);

  console.log('\nAll tests completed successfully!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
