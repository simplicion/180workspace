const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, 'apps', 'social-studio-mobile', 'android', 'app', 'src', 'main', 'res');
const playStoreDir = path.join(__dirname, 'play-store-assets');

// High-end cinematic Hollywood studio SVG icon
const hollywoodIconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Deep obsidian cinema gradient -->
    <radialGradient id="cinemaBg" cx="50%" cy="36%" r="68%">
      <stop offset="0%" stop-color="#1A1829"/>
      <stop offset="45%" stop-color="#0B0B11"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>

    <!-- Anamorphic lens flare / cobalt streak -->
    <linearGradient id="lensStreak" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4F46E5" stop-opacity="0"/>
      <stop offset="35%" stop-color="#6366F1" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#A5B4FC" stop-opacity="1"/>
      <stop offset="65%" stop-color="#818CF8" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0"/>
    </linearGradient>

    <!-- Metallic silver bevel gradient -->
    <linearGradient id="metallicChrome" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#E2E8F0"/>
      <stop offset="70%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>

    <!-- Gold-to-indigo cinematic accent -->
    <linearGradient id="hollywoodAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="40%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>

    <!-- Soft drop shadow -->
    <filter id="cinematicGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base App Background (squircle with smooth curvature) -->
  <rect width="512" height="512" rx="114" fill="url(#cinemaBg)"/>
  <rect x="2" y="2" width="508" height="508" rx="112" stroke="#27272A" stroke-width="2.5"/>

  <!-- Anamorphic cinematic horizontal horizon flare -->
  <ellipse cx="256" cy="240" rx="210" ry="24" fill="url(#lensStreak)" opacity="0.45" filter="url(#cinematicGlow)"/>

  <!-- Outer Studio Ring (Aperture / Director Iris) -->
  <circle cx="256" cy="235" r="148" stroke="#1F1F2A" stroke-width="6"/>
  <circle cx="256" cy="235" r="148" stroke="url(#hollywoodAccent)" stroke-width="2.5" stroke-dasharray="24 16 48 16"/>

  <!-- Inner Shutter Blades & Cine Compass -->
  <g opacity="0.3" stroke="#94A3B8" stroke-width="1.5">
    <line x1="256" y1="92" x2="256" y2="114"/>
    <line x1="256" y1="356" x2="256" y2="378"/>
    <line x1="113" y1="235" x2="135" y2="235"/>
    <line x1="377" y1="235" x2="399" y2="235"/>
  </g>

  <!-- Iconic Sculpted "180" Monogram -->
  <g transform="translate(112, 160)">
    <!-- "1" -->
    <path d="M24 146V28L4 44V16L28 0H52V146H24Z" fill="url(#metallicChrome)"/>
    <path d="M52 0L54 2V146H52V0Z" fill="#FFFFFF" opacity="0.8"/>

    <!-- "8" -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M128 0C152 0 170 16 170 38C170 54 158 67 144 72C162 78 176 94 176 114C176 138 154 152 128 152C102 152 80 138 80 114C80 94 94 78 112 72C98 67 86 54 86 38C86 16 104 0 128 0ZM128 26C116 26 108 34 108 42C108 51 116 58 128 58C140 58 148 51 148 42C148 34 140 26 128 26ZM128 84C114 84 104 94 104 106C104 118 114 126 128 126C142 126 152 118 152 106C152 94 142 84 128 84Z" fill="url(#metallicChrome)"/>

    <!-- "0" / Lens Shutter Core -->
    <circle cx="236" cy="76" r="66" fill="#0E0E15" stroke="url(#metallicChrome)" stroke-width="26"/>
    <!-- Shutter Aperture Triangle Core (Electric Neon Indigo) -->
    <polygon points="236,54 256,88 216,88" fill="url(#hollywoodAccent)"/>
    <circle cx="236" cy="76" r="8" fill="#FFFFFF"/>
  </g>

  <!-- Hollywood Studio "MANAGER" Bottom Plaque -->
  <g transform="translate(146, 400)">
    <rect width="220" height="34" rx="17" fill="#12121A" stroke="#27272A" stroke-width="1.5"/>
    <!-- Small electric indicator -->
    <circle cx="24" cy="17" r="4.5" fill="#38BDF8"/>
    <text x="38" y="22" fill="#F4F4F5" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="13" letter-spacing="3">MANAGER</text>
  </g>
</svg>
`;

async function run() {
  console.log('Generating Hollywood-Grade App Icons & Resources...');

  const iconBuffer = Buffer.from(hollywoodIconSvg);

  // 1. Android Mipmap densities for the mobile app
  const densities = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 }
  ];

  for (const d of densities) {
    const targetDir = path.join(resDir, d.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, 'ic_launcher.png');
    await sharp(iconBuffer)
      .resize(d.size, d.size)
      .png({ compressionLevel: 9 })
      .toFile(targetPath);
    console.log(`Updated Android launcher icon: ${d.dir}/ic_launcher.png (${d.size}x${d.size})`);
  }

  // 2. Play Store 512x512 High-Res Icon
  const playStoreIconPath = path.join(playStoreDir, 'icon-512x512.png');
  await sharp(iconBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(playStoreIconPath);
  console.log(`Updated Play Store High-Res Icon: icon-512x512.png`);

  // 3. Feature Graphic (1024x500) with "180 MANAGER"
  const featureSvg = `
  <svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="featureGlow" cx="20%" cy="30%" r="85%">
        <stop offset="0%" stop-color="#1A182E"/>
        <stop offset="50%" stop-color="#0B0B10"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#CBD5E1"/>
      </linearGradient>
      <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38BDF8"/>
        <stop offset="50%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4F46E5"/>
        <stop offset="100%" stop-color="#7C3AED"/>
      </linearGradient>
    </defs>

    <rect width="1024" height="500" fill="url(#featureGlow)"/>

    <!-- Subtle studio grid -->
    <path d="M0 100H1024M0 200H1024M0 300H1024M0 400H1024" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>
    <path d="M200 0V500M400 0V500M600 0V500M800 0V500" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>

    <!-- Left Content -->
    <g transform="translate(68, 75)">
      <!-- Hollywood Badge -->
      <rect width="180" height="34" rx="17" fill="#14141F" stroke="#27272A" stroke-width="1"/>
      <circle cx="18" cy="17" r="5" fill="#38BDF8"/>
      <text x="32" y="22" fill="#F4F4F5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="12" letter-spacing="2">180 MANAGER</text>

      <!-- Main Title -->
      <text x="0" y="92" fill="url(#titleGrad)" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" letter-spacing="-1">
        Hollywood-Grade
      </text>
      <text x="0" y="146" fill="url(#neonGrad)" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="46" letter-spacing="-1">
        AI Video &amp; Social Studio
      </text>

      <!-- Description -->
      <text x="0" y="200" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400">
        Autonomous 30-Day Strategy • Precision Teleprompter • On-Device NLE
      </text>
      <text x="0" y="228" fill="#64748B" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="400">
        Direct 1-Click Publishing to Instagram, YouTube Shorts, TikTok, X &amp; LinkedIn
      </text>

      <!-- Badges -->
      <g transform="translate(0, 265)">
        <rect width="165" height="42" rx="12" fill="#101016" stroke="#27272A" stroke-width="1"/>
        <text x="14" y="26" fill="#F4F4F5" font-family="sans-serif" font-weight="bold" font-size="13">🎬 Media Studio NLE</text>

        <rect x="178" width="165" height="42" rx="12" fill="#101016" stroke="#27272A" stroke-width="1"/>
        <text x="194" y="26" fill="#F4F4F5" font-family="sans-serif" font-weight="bold" font-size="13">🧠 5 Psychology Hooks</text>

        <rect x="356" width="165" height="42" rx="12" fill="#101016" stroke="#27272A" stroke-width="1"/>
        <text x="372" y="26" fill="#F4F4F5" font-family="sans-serif" font-weight="bold" font-size="13">🚀 1-Click Multi-Publish</text>
      </g>
    </g>

    <!-- Right Device Mockup -->
    <g transform="translate(680, 50)">
      <rect width="280" height="400" rx="36" fill="#0A0A0E" stroke="#27272A" stroke-width="3"/>
      <rect x="10" y="10" width="260" height="380" rx="28" fill="#000000"/>
      
      <!-- Mockup Header -->
      <rect x="25" y="25" width="230" height="50" rx="14" fill="#121218" stroke="#27272A" stroke-width="1"/>
      <circle cx="48" cy="50" r="14" fill="#6366F1"/>
      <text x="70" y="47" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="12">180 Manager</text>
      <text x="70" y="62" fill="#10B981" font-family="sans-serif" font-size="10">Hollywood Cinema NLE</text>

      <!-- Mockup Video Preview -->
      <rect x="25" y="88" width="230" height="180" rx="16" fill="#14141E" stroke="#3F3F46" stroke-width="1"/>
      <circle cx="140" cy="178" r="26" fill="#6366F1" fill-opacity="0.9"/>
      <polygon points="135,168 152,178 135,188" fill="#FFFFFF"/>
      <rect x="35" y="235" width="105" height="22" rx="6" fill="#38BDF8"/>
      <text x="42" y="250" fill="#000000" font-family="sans-serif" font-weight="bold" font-size="10">4K 60FPS HARDWARE</text>

      <!-- Action Button -->
      <rect x="25" y="285" width="230" height="46" rx="14" fill="url(#btnGrad)"/>
      <text x="64" y="313" fill="#FFFFFF" font-family="sans-serif" font-weight="bold" font-size="13">Publish to 5 Channels</text>
      
      <text x="45" y="360" fill="#64748B" font-family="sans-serif" font-size="11">IG • YouTube • TikTok • X • LinkedIn</text>
    </g>
  </svg>
  `;

  await sharp(Buffer.from(featureSvg))
    .resize(1024, 500)
    .png({ compressionLevel: 9 })
    .toFile(path.join(playStoreDir, 'feature-graphic-1024x500.png'));
  console.log(`Updated Play Store Feature Graphic: feature-graphic-1024x500.png`);

  // 4. Update the 5 Screenshots with "180 Manager" title
  const screenshots = [
    {
      filename: 'screenshot-1-content-calendar.png',
      title: '30-Day Autonomous Calendar',
      subtitle: 'Strategic multi-pillar schedule with 5 psychological hooks',
      accent: '#4F46E5',
      badge: '180 MANAGER STRATEGY',
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
      badge: 'HOLLYWOOD HARDWARE NLE',
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
      badge: 'OBSIDIAN DESIGN SYSTEM',
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
        <text x="48" y="31" fill="#F4F4F5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="16" letter-spacing="1">${item.badge}</text>
        
        <text x="0" y="130" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="58" letter-spacing="-1">${item.title}</text>
        <text x="0" y="180" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="400">${item.subtitle}</text>
      </g>

      <!-- Center Mobile UI Canvas Window -->
      <g transform="translate(80, 360)">
        <rect width="920" height="1440" rx="64" fill="#0C0C10" stroke="#27272A" stroke-width="4"/>
        
        <!-- App Bar -->
        <rect x="40" y="40" width="840" height="90" rx="24" fill="#14141A" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="85" cy="85" r="22" fill="${item.accent}"/>
        <text x="125" y="93" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="26">180 Manager</text>
        <rect x="740" y="65" width="110" height="40" rx="12" fill="#27272A"/>
        <text x="762" y="90" fill="#10B981" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="16">ONLINE</text>

        <!-- Main Feature Card -->
        <rect x="40" y="160" width="840" height="520" rx="36" fill="url(#cardGrad${i})" stroke="#27272A" stroke-width="2"/>
        <rect x="80" y="200" width="220" height="38" rx="19" fill="#1C1C24" stroke="#3F3F46" stroke-width="1"/>
        <text x="100" y="225" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="16">★ 180 STUDIO</text>
        
        <text x="80" y="300" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="36">${item.cardTitle}</text>
        <text x="80" y="350" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="22">${item.cardPillar}</text>
        
        <!-- Video / Mock Visual Section -->
        <rect x="80" y="390" width="760" height="240" rx="24" fill="#000000" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="460" cy="510" r="44" fill="${item.accent}" fill-opacity="0.9"/>
        <polygon points="450,495 480,510 450,525" fill="#FFFFFF"/>
        <text x="120" y="600" fill="#F4F4F5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="18">${item.cardMetric}</text>

        <!-- Bottom Action Cards -->
        <rect x="40" y="710" width="840" height="180" rx="32" fill="#14141C" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="100" cy="800" r="28" fill="#10B981"/>
        <text x="150" y="790" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="24">Deterministic NLE Audio Ducking</text>
        <text x="150" y="825" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="18">Voice dialogue prioritized with automatic background BGM sidechain</text>

        <!-- Primary Action Button -->
        <rect x="40" y="920" width="840" height="110" rx="32" fill="url(#accentGrad${i})"/>
        <text x="320" y="988" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="28">Direct Studio Action</text>

        <!-- Navigation Dock -->
        <rect x="40" y="1260" width="840" height="110" rx="32" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
        <text x="110" y="1325" fill="${item.accent}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">📅 Calendar</text>
        <text x="320" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">🎬 Studio</text>
        <text x="520" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">✍️ Scripts</text>
        <text x="730" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">🚀 Publish</text>
      </g>
    </svg>`;

    await sharp(Buffer.from(screenSvg))
      .resize(1080, 1920)
      .png({ compressionLevel: 9 })
      .toFile(path.join(playStoreDir, item.filename));
    console.log(`Updated Screenshot: ${item.filename} (1080x1920)`);
  }

  console.log('All Hollywood-grade icons and Play Store assets generated successfully!');
}

run().catch(err => {
  console.error('Error generating Hollywood icons:', err);
  process.exit(1);
});
