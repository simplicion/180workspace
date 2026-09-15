import fetch from 'node-fetch';

async function check() {
  const urls = [
    'http://localhost:3004/tools/pdf-converter',
    'http://localhost:3004/tools/invoice-generator',
    'http://localhost:3004/tools/youtube-tools',
    'http://localhost:3004/tools/utm-builder'
  ];

  for (const url of urls) {
    console.log(`\n================ Checking ${url} ================`);
    const res = await fetch(url);
    const html = await res.text();
    console.log('Status:', res.status);
    
    // Find astro-island tag
    const islandMatch = html.match(/<astro-island[^>]+>/);
    if (islandMatch) {
      console.log('Astro-island attributes:', islandMatch[0]);
    } else {
      console.log('No astro-island found!');
    }

    // Extract all script tags
    const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    console.log(`Found ${scriptMatches.length} script tags`);

    // Check script src tags
    const srcMatches = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
    console.log('Script/Asset srcs:', srcMatches);

    // Let's test fetching those script srcs to see if any return 404 or 500 error!
    for (const src of srcMatches) {
      if (src.endsWith('.js') || src.includes('/@fs/') || src.includes('/@vite/') || src.includes('/src/')) {
        const fullSrc = src.startsWith('http') ? src : `http://localhost:3004${src}`;
        try {
          const sRes = await fetch(fullSrc);
          console.log(`  Fetch script [${sRes.status}]: ${fullSrc.substring(0, 100)}`);
          if (!sRes.ok) {
            console.error(`  ERROR FETCHING SCRIPT: ${sRes.status} ${sRes.statusText}`);
          }
        } catch (err) {
          console.error(`  FETCH FAILED: ${fullSrc}`, err.message);
        }
      }
    }
  }
}

check().catch(console.error);
