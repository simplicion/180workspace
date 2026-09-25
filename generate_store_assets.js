const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'play-store-assets');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

async function generateAssets() {
    console.log('Generating Play Store Assets...');

    // 1. High-Res App Icon (512x512 PNG)
    const iconSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#181822"/>
          <stop offset="100%" stop-color="#000000"/>
        </radialGradient>
        <linearGradient id="needleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3B82F6"/>
          <stop offset="100%" stop-color="#6366F1"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      
      <!-- Rounded Icon Base -->
      <rect width="512" height="512" rx="112" fill="url(#bgGlow)"/>
      <rect x="2" y="2" width="508" height="508" rx="110" stroke="#27272A" stroke-width="3"/>
      
      <!-- Inner Glow Card -->
      <rect x="44" y="44" width="424" height="424" rx="92" fill="#0D0D10" stroke="#3F3F46" stroke-width="1.5" filter="url(#shadow)"/>
      
      <!-- 180 Studio Glyph -->
      <g transform="translate(46, 46) scale(1.0)">
        <path d="M418.357 185.204C416.467 168.854 412.687 153.074 407.237 138.094C402.697 125.544 396.977 113.544 390.207 102.234C386.117 95.3744 381.637 88.7744 376.807 82.4544C367.307 70.0244 356.447 58.6844 344.457 48.6744C317.087 26.3244 284.167 10.9944 249.347 4.11444C234.627 1.65444 229.617 1.07444 224.587 0.664444C218.267 0.254444 216.607 0.174444 214.947 0.114444C210.387 0.00444444 207.897 0.00444444 207.207 0.0144444C198.357 0.344444 193.697 0.664444 188.667 1.07444C178.677 2.40444 173.497 3.25444 168.937 4.11444C161.897 5.50444 154.927 7.24444 148.077 9.31444C67.1568 33.7544 1.24682 104.654 0.00682264 202.784C-0.0431774 206.514 0.186823 210.254 0.526823 213.974C2.27682 237.174 7.03682 273.484 21.0968 306.874C41.9968 334.874 57.0268 352.844 68.4668 364.164C96.6268 389.984 131.867 408.214 170.937 415.604C186.727 418.234 197.347 419.144 208.147 419.244H211.307C221.847 418.924 330.047 412.964 419.657 216.064C419.757 201.354 419.277 193.214 418.347 185.204H418.357ZM333.177 267.654C313.717 306.124 261.657 335.474 235.847 285.294C220.987 254.364 217.927 220.194 213.197 190.034C211.857 188.054 210.427 187.354 209.147 187.624C207.307 187.674 206.167 188.434 205.087 190.034C200.187 221.284 197.077 256.834 182.437 285.294C172.587 304.454 158.907 312.014 144.677 311.914C120.927 311.554 96.5968 291.334 84.6268 267.654C48.2768 195.784 85.7068 110.694 158.927 82.4044C175.097 76.1544 191.757 73.2444 208.157 73.2644H210.127C226.377 73.2944 242.867 76.2144 258.877 82.4044C332.097 110.694 369.527 195.784 333.177 267.654Z" fill="#F4F4F5"/>
        <path d="M232.207 178.674C228.857 184.154 221.517 174.664 217.907 172.334C214.317 170.004 211.517 169.044 209.147 169.004C206.777 169.044 203.967 170.004 200.377 172.334C196.767 174.664 189.427 184.154 186.077 178.674C180.307 169.254 192.157 143.434 197.867 134.854C201.597 129.264 204.807 125.264 208.157 124.244C209.477 124.074 210.127 124.244 210.127 124.244C213.477 125.264 216.687 129.264 220.417 134.854C226.127 143.434 237.977 169.254 232.207 178.674Z" fill="url(#needleGrad)"/>
      </g>
    </svg>`;

    await sharp(Buffer.from(iconSvg))
        .resize(512, 512)
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, 'icon-512x512.png'));
    console.log('Created: icon-512x512.png (512x512)');

    // 2. Play Store Feature Graphic (1024x500 PNG)
    const featureSvg = `
    <svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgFeatureGlow" cx="25%" cy="30%" r="85%">
          <stop offset="0%" stop-color="#1E1E2E"/>
          <stop offset="50%" stop-color="#0A0A0E"/>
          <stop offset="100%" stop-color="#000000"/>
        </radialGradient>
        <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="100%" stop-color="#7C3AED"/>
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#A1A1AA"/>
        </linearGradient>
      </defs>

      <rect width="1024" height="500" fill="url(#bgFeatureGlow)"/>

      <!-- Subtle Grid Accents -->
      <path d="M0 100H1024M0 200H1024M0 300H1024M0 400H1024" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>
      <path d="M200 0V500M400 0V500M600 0V500M800 0V500" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>

      <!-- Left Content -->
      <g transform="translate(70, 75)">
        <!-- Brand Badge -->
        <rect width="210" height="34" rx="17" fill="#18181B" stroke="#27272A" stroke-width="1"/>
        <circle cx="18" cy="17" r="5" fill="#10B981"/>
        <text x="32" y="22" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="12" letter-spacing="1">180 SOCIAL MANAGER</text>

        <!-- Main Title -->
        <text x="0" y="90" fill="url(#textGrad)" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" letter-spacing="-1">
          Autonomous AI Video
        </text>
        <text x="0" y="142" fill="#818CF8" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" letter-spacing="-1">
          &amp; Social Media Studio
        </text>

        <!-- Description -->
        <text x="0" y="195" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="400">
          Psychological Hooks • 30-Day Calendars • On-Device NLE Video Editing
        </text>
        <text x="0" y="222" fill="#71717A" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="400">
          Direct 1-Click Publishing to Instagram, YouTube Shorts, TikTok, X &amp; LinkedIn
        </text>

        <!-- Feature Pills -->
        <g transform="translate(0, 260)">
          <!-- Pill 1 -->
          <rect width="180" height="42" rx="12" fill="#121216" stroke="#27272A" stroke-width="1"/>
          <text x="16" y="26" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13">🎬 Media Studio NLE</text>
          
          <!-- Pill 2 -->
          <rect x="192" width="180" height="42" rx="12" fill="#121216" stroke="#27272A" stroke-width="1"/>
          <text x="208" y="26" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13">🧠 5 Psychology Hooks</text>
          
          <!-- Pill 3 -->
          <rect x="384" width="180" height="42" rx="12" fill="#121216" stroke="#27272A" stroke-width="1"/>
          <text x="400" y="26" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13">🚀 1-Click Multi-Publish</text>
        </g>
      </g>

      <!-- Right Device Mockup Card -->
      <g transform="translate(680, 50)">
        <rect width="280" height="400" rx="36" fill="#0C0C0E" stroke="#27272A" stroke-width="3"/>
        <rect x="10" y="10" width="260" height="380" rx="28" fill="#000000"/>
        
        <!-- Mockup Header -->
        <rect x="25" y="25" width="230" height="50" rx="14" fill="#141418" stroke="#27272A" stroke-width="1"/>
        <circle cx="48" cy="50" r="14" fill="#4F46E5"/>
        <text x="70" y="47" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="12">Day 14 • Pattern Interrupt</text>
        <text x="70" y="62" fill="#10B981" font-family="Arial, Helvetica, sans-serif" font-size="10">Master Deliverable Ready</text>

        <!-- Video Player Preview -->
        <rect x="25" y="88" width="230" height="180" rx="16" fill="#18181E" stroke="#3F3F46" stroke-width="1"/>
        <circle cx="140" cy="178" r="26" fill="#4F46E5" fill-opacity="0.9"/>
        <polygon points="135,168 152,178 135,188" fill="#FFFFFF"/>
        <rect x="35" y="235" width="90" height="22" rx="6" fill="#FFE600"/>
        <text x="42" y="250" fill="#000000" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="10">HOOK: 0-3 SEC</text>

        <!-- Action Button -->
        <rect x="25" y="285" width="230" height="46" rx="14" fill="url(#btnGrad)"/>
        <text x="58" y="313" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="13">Publish to 5 Channels</text>
        
        <!-- Channels row -->
        <text x="45" y="360" fill="#71717A" font-family="Arial, Helvetica, sans-serif" font-size="11">IG • YouTube • TikTok • X • LinkedIn</text>
      </g>
    </svg>`;

    await sharp(Buffer.from(featureSvg))
        .resize(1024, 500)
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, 'feature-graphic-1024x500.png'));
    console.log('Created: feature-graphic-1024x500.png (1024x500)');

    // 3. High-Res Mobile Screenshots (1080x1920 portrait PNGs)
    const screenshots = [
        {
            filename: 'screenshot-1-content-calendar.png',
            title: '30-Day Autonomous Calendar',
            subtitle: 'Strategic multi-pillar schedule with 5 psychological hooks',
            accent: '#4F46E5',
            badge: 'AI CONTENT STRATEGIST',
            cardTitle: 'Day 12: The Contrarian Truth',
            cardPillar: 'Growth &amp; Authority • 9:16 Video',
            cardMetric: 'Est. Reach: 45.2K Impressions'
        },
        {
            filename: 'screenshot-2-teleprompter-script.png',
            title: 'Teleprompter Scriptwriting',
            subtitle: '0-3s Pattern Interrupt, retention loops, and viral CTAs',
            accent: '#8B5CF6',
            badge: 'PSYCHOLOGICAL SCRIPTS',
            cardTitle: '0-3s Hook: &quot;Stop burning ad budget...&quot;',
            cardPillar: 'Problem Agitation • Solution Payoff',
            cardMetric: 'Retention Score: 94 / 100'
        },
        {
            filename: 'screenshot-3-media-studio-nle.png',
            title: 'Media Studio On-Device NLE',
            subtitle: 'Silence trims, kinetic captions in brand colors, ducked audio',
            accent: '#10B981',
            badge: 'ZERO SYNTHETIC PIXELS',
            cardTitle: 'Timeline AST: 9:16 Vertical Reel',
            cardPillar: 'AndroidX Media3 Hardware Encoder',
            cardMetric: '60 FPS Full HD Render'
        },
        {
            filename: 'screenshot-4-multi-platform-publish.png',
            title: '1-Click Multi-Publishing',
            subtitle: 'Direct automated dispatch to Instagram, YouTube, TikTok, LinkedIn &amp; X',
            accent: '#EC4899',
            badge: 'MULTI-PLATFORM DISPATCHER',
            cardTitle: 'All Accounts Connected &amp; Verified',
            cardPillar: 'Live API OAuth Adapters',
            cardMetric: 'Instant Live Links Dispatched'
        },
        {
            filename: 'screenshot-5-brand-consciousness.png',
            title: 'Brand DNA &amp; Visual Identity',
            subtitle: 'Enforces primary colors, typography, and voice tone guidelines',
            accent: '#06B6D4',
            badge: 'BRAND CONSCIOUSNESS',
            cardTitle: 'Company &amp; Creator Profiles',
            cardPillar: 'Hex DNA: #000000 Base • Zinc Greys',
            cardMetric: '100% Brand Consistency'
        }
    ];

    for (let i = 0; i < screenshots.length; i++) {
        const item = screenshots[i];
        const screenSvg = `
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="screenBg${i}" cx="50%" cy="20%" r="70%">
              <stop offset="0%" stop-color="#14141E"/>
              <stop offset="50%" stop-color="#08080C"/>
              <stop offset="100%" stop-color="#000000"/>
            </radialGradient>
            <linearGradient id="cardGrad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#181822"/>
              <stop offset="100%" stop-color="#101014"/>
            </linearGradient>
            <linearGradient id="accentGrad${i}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${item.accent}"/>
              <stop offset="100%" stop-color="#6366F1"/>
            </linearGradient>
          </defs>

          <!-- Deep Black Base Background -->
          <rect width="1080" height="1920" fill="url(#screenBg${i})"/>

          <!-- Top Status Bar & Header -->
          <g transform="translate(80, 100)">
            <rect width="280" height="48" rx="24" fill="#18181F" stroke="#27272A" stroke-width="2"/>
            <circle cx="28" cy="24" r="8" fill="${item.accent}"/>
            <text x="48" y="31" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="16" letter-spacing="1">${item.badge}</text>
            
            <text x="0" y="130" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="58" letter-spacing="-1">${item.title}</text>
            <text x="0" y="180" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="400">${item.subtitle}</text>
          </g>

          <!-- Center Mobile UI Canvas Window -->
          <g transform="translate(80, 360)">
            <!-- Outer Phone Frame -->
            <rect width="920" height="1440" rx="64" fill="#0C0C10" stroke="#27272A" stroke-width="4"/>
            
            <!-- App Bar -->
            <rect x="40" y="40" width="840" height="90" rx="24" fill="#14141A" stroke="#27272A" stroke-width="1.5"/>
            <circle cx="85" cy="85" r="22" fill="${item.accent}"/>
            <text x="125" y="93" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="26">180 Social Manager</text>
            <rect x="740" y="65" width="110" height="40" rx="12" fill="#27272A"/>
            <text x="762" y="90" fill="#10B981" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="16">ONLINE</text>

            <!-- Main Feature Card -->
            <rect x="40" y="160" width="840" height="520" rx="36" fill="url(#cardGrad${i})" stroke="#27272A" stroke-width="2"/>
            <rect x="80" y="200" width="220" height="38" rx="19" fill="#1C1C24" stroke="#3F3F46" stroke-width="1"/>
            <text x="100" y="225" fill="#FFE600" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="16">★ HIGH IMPACT</text>
            
            <text x="80" y="300" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="36">${item.cardTitle}</text>
            <text x="80" y="350" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="22">${item.cardPillar}</text>
            
            <!-- Video / Mock Visual Section -->
            <rect x="80" y="390" width="760" height="240" rx="24" fill="#000000" stroke="#27272A" stroke-width="1.5"/>
            <circle cx="460" cy="510" r="44" fill="${item.accent}" fill-opacity="0.9"/>
            <polygon points="450,495 480,510 450,525" fill="#FFFFFF"/>
            <text x="120" y="600" fill="#F4F4F5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="18">${item.cardMetric}</text>

            <!-- Bottom Action Cards -->
            <rect x="40" y="710" width="840" height="180" rx="32" fill="#14141C" stroke="#27272A" stroke-width="1.5"/>
            <circle cx="100" cy="800" r="28" fill="#10B981"/>
            <text x="150" y="790" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="24">Deterministic NLE Audio Ducking</text>
            <text x="150" y="825" fill="#A1A1AA" font-family="Arial, Helvetica, sans-serif" font-size="18">Voice dialogue prioritized with automatic background BGM sidechain</text>

            <!-- Primary Action Button -->
            <rect x="40" y="920" width="840" height="110" rx="32" fill="url(#accentGrad${i})"/>
            <text x="320" y="988" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="28">Direct Studio Action</text>

            <!-- Navigation Dock -->
            <rect x="40" y="1260" width="840" height="110" rx="32" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
            <text x="110" y="1325" fill="${item.accent}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="22">📅 Calendar</text>
            <text x="320" y="1325" fill="#71717A" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="22">🎬 Studio</text>
            <text x="520" y="1325" fill="#71717A" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="22">✍️ Scripts</text>
            <text x="730" y="1325" fill="#71717A" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="22">🚀 Publish</text>
          </g>
        </svg>`;

        await sharp(Buffer.from(screenSvg))
            .resize(1080, 1920)
            .png({ compressionLevel: 9 })
            .toFile(path.join(outDir, item.filename));
        console.log(`Created: ${item.filename} (1080x1920)`);
    }

    console.log('All Play Store graphics generated successfully in play-store-assets/');
}

generateAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
});
