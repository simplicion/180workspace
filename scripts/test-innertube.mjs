import fetch from 'node-fetch';

async function testVideo(videoId) {
  console.log(`\n================ Testing Video: ${videoId} ================`);
  const watchUrl = 'https://www.youtube.com/watch?v=' + videoId;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const response = await fetch(watchUrl, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'en-US,en;q=0.9' } });
  const html = await response.text();

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  console.log('Title:', titleMatch ? titleMatch[1] : 'Unknown');

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const clientVersionMatch = html.match(/"clientVersion":"([^"]+)"/);
  const paramsMatch = html.match(/"getTranscriptEndpoint":{"params":"([^"]+)"/);

  if (apiKeyMatch && paramsMatch) {
    const rawParams = decodeURIComponent(paramsMatch[1]);

    const itRes = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?key=' + apiKeyMatch[1], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: clientVersionMatch ? clientVersionMatch[1] : '2.20240101.00.00',
            hl: 'en',
            gl: 'US'
          }
        },
        params: rawParams
      })
    });

    console.log('InnerTube API Status with decoded params:', itRes.status);
    const data = await itRes.json();
    const initialSegments = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
    console.log('Extracted segments count via InnerTube:', initialSegments?.length);

    if (initialSegments && initialSegments.length > 0) {
      console.log('First 3 segments:');
      initialSegments.slice(0, 3).forEach((s) => {
        const seg = s.transcriptSegmentRenderer;
        const text = seg?.snippet?.runs?.map((r) => r.text).join('') || '';
        const time = seg?.startMs;
        console.log(`  [${time}ms] ${text}`);
      });
      return true;
    }
  }
  return false;
}

async function run() {
  await testVideo('UF8uR6Z6KLc');
  await testVideo('dQw4w9WgXcQ');
}

run().catch(console.error);
