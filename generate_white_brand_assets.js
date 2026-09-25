const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, 'apps', 'social-studio-mobile', 'android', 'app', 'src', 'main', 'res');
const playStoreDir = path.join(__dirname, 'play-store-assets');
const mobileAssetsDir = path.join(__dirname, 'apps', 'social-studio-mobile', 'assets', 'logo');

if (!fs.existsSync(mobileAssetsDir)) {
  fs.mkdirSync(mobileAssetsDir, { recursive: true });
}

// 1. Exact SVG of the 180 Brand Favicon
// Sourced from apps/marketing-web/public/favicon.svg
const faviconSvg = `
<svg width="560" height="559" viewBox="0 0 560 559" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M557.816 246.943C555.296 225.142 550.256 204.102 542.99 184.128C536.936 167.395 529.309 151.395 520.283 136.314C514.829 127.168 508.856 118.368 502.416 109.941C489.749 93.3672 475.269 78.247 459.282 64.9001C422.788 35.0997 378.894 14.6595 332.467 5.486C331.453 5.286 330.453 5.08599 329.44 4.89932C328.427 4.71266 327.413 4.52599 326.387 4.33932C324.093 3.93931 321.787 3.55264 319.48 3.20597C312.84 2.20596 306.16 1.43261 299.453 0.885938C298.493 0.805937 297.52 0.739269 296.56 0.672601C295.453 0.605934 294.346 0.525933 293.24 0.459265C291.026 0.339264 288.813 0.232596 286.6 0.152595C285.493 0.112594 284.386 0.0859271 283.279 0.05926C282.359 0.032593 281.439 0.0192595 280.519 0.005926H280.173C279.786 0.005926 279.413 0.005926 279.026 0.005926H278.853C278.853 0.005926 278.706 -0.00740751 278.626 0.005926C278.266 0.005926 277.906 0.005926 277.546 0.005926H277.199C276.279 0.0192595 275.359 0.032593 274.439 0.05926C273.333 0.0859271 272.226 0.112594 271.119 0.152595C268.906 0.232596 266.693 0.339264 264.479 0.459265C263.373 0.525933 262.266 0.605934 261.159 0.672601C260.199 0.739269 259.226 0.805937 258.266 0.885938C251.559 1.43261 244.879 2.20596 238.239 3.20597C235.932 3.55264 233.626 3.93931 231.332 4.33932C230.305 4.52599 229.292 4.71266 228.279 4.89932C227.265 5.08599 226.265 5.286 225.252 5.486C215.865 7.33936 206.572 9.65939 197.438 12.4194C89.5436 45.0065 1.66245 139.541 0.00909697 270.383C-0.0575706 275.356 0.2491 280.343 0.702439 285.303C0.755773 288.343 0.862442 291.37 1.02244 294.383C1.40912 301.743 2.08912 309.037 3.0358 316.237C9.38255 364.651 28.1295 409.171 55.9965 446.505C62.2233 454.865 68.93 462.865 76.0368 470.465C80.9302 475.692 86.0236 480.719 91.2903 485.559C128.837 519.986 175.825 544.293 227.919 554.147C230.319 554.6 232.745 555.027 235.172 555.413C248.972 557.653 263.133 558.867 277.533 559C278.359 559 279.186 559 280.013 559H280.159C280.613 559 281.079 559 281.533 559C281.599 559 281.679 559 281.746 559C286.306 558.973 290.84 558.84 295.346 558.6C295.506 558.6 295.653 558.6 295.8 558.573C440.068 550.627 555.163 433.292 559.55 288.09C559.643 285.236 559.683 282.37 559.683 279.49C559.683 268.476 559.043 257.623 557.803 246.943H557.816ZM444.242 356.877C418.295 408.171 348.88 447.305 314.467 380.398C313.787 379.078 313.133 377.744 312.48 376.398C294.653 339.157 290.573 293.596 284.266 253.383C282.479 250.743 280.573 249.809 278.866 250.169C278.533 250.089 278.186 250.076 277.839 250.103C276.413 250.236 274.893 251.249 273.453 253.383C266.919 295.05 262.773 342.45 243.252 380.398C230.119 405.945 211.879 416.025 192.905 415.891C192.545 415.878 192.198 415.878 191.852 415.878C161.238 415.411 128.797 388.451 112.837 356.877C64.3699 261.049 114.277 147.595 211.905 109.874C233.465 101.541 255.679 97.6606 277.546 97.6872C277.986 97.6872 278.426 97.6872 278.866 97.7006H280.173C301.84 97.7272 323.827 101.621 345.174 109.874C442.802 147.595 492.709 261.049 444.242 356.877Z" fill="#090D16"/>
  <path d="M309.614 238.235C305.147 245.542 295.36 232.889 290.547 229.782C285.76 226.675 282.027 225.395 278.867 225.342C275.707 225.395 271.96 226.675 267.173 229.782C262.36 232.889 252.573 245.542 248.106 238.235C240.413 225.675 256.213 191.248 263.827 179.808C268.8 172.355 273.08 167.021 277.547 165.661C277.987 165.528 278.427 165.434 278.867 165.381C279.307 165.434 279.747 165.528 280.173 165.661C284.64 167.021 288.92 172.355 293.894 179.808C301.507 191.248 317.307 225.675 309.614 238.235Z" fill="#0457FC"/>
</svg>
`;

// 2. White Theme App Icon:
// - White background
// - "1" in solid bold black
// - "8" in solid bold black
// - In place of "0": The exact 180 Brand Favicon with black ring and blue needle!
// - Bottom subtitle badge: "MANAGER"
const whiteThemeIconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Soft shadow filter for depth -->
    <filter id="softCardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.08"/>
    </filter>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- Clean White Squircle Background -->
  <rect width="512" height="512" rx="114" fill="#FFFFFF"/>
  <rect x="2" y="2" width="508" height="508" rx="112" stroke="#E4E4E7" stroke-width="2.5"/>

  <!-- Subtle Inner Card Container -->
  <rect x="24" y="24" width="464" height="464" rx="90" fill="#FAFAFA" stroke="#F4F4F5" stroke-width="1.5" filter="url(#softCardShadow)"/>

  <!-- Centered "1" "8" and "[FAVICON as 0]" -->
  <g transform="translate(48, 142)">
    <!-- Number "1" in Solid Pitch Black -->
    <path d="M42 168V34L18 52V20L48 0H74V168H42Z" fill="#090D16"/>

    <!-- Number "8" in Solid Pitch Black -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M166 0C194 0 216 18 216 44C216 62 202 78 186 84C206 90 222 108 222 132C222 160 196 176 166 176C136 176 110 160 110 132C110 108 126 90 146 84C130 78 116 62 116 44C116 18 138 0 166 0ZM166 30C152 30 142 39 142 48C142 58 152 68 166 68C180 68 190 58 190 48C190 39 180 30 166 30ZM166 98C150 98 138 109 138 123C138 137 150 146 166 146C182 146 194 137 194 123C194 109 182 98 166 98Z" fill="#090D16"/>

    <!-- In Place of "0": The Exact 180 Brand Favicon -->
    <g transform="translate(244, -12) scale(0.358)">
      <!-- Outer Favicon Ring Path -->
      <path d="M557.816 246.943C555.296 225.142 550.256 204.102 542.99 184.128C536.936 167.395 529.309 151.395 520.283 136.314C514.829 127.168 508.856 118.368 502.416 109.941C489.749 93.3672 475.269 78.247 459.282 64.9001C422.788 35.0997 378.894 14.6595 332.467 5.486C331.453 5.286 330.453 5.08599 329.44 4.89932C328.427 4.71266 327.413 4.52599 326.387 4.33932C324.093 3.93931 321.787 3.55264 319.48 3.20597C312.84 2.20596 306.16 1.43261 299.453 0.885938C298.493 0.805937 297.52 0.739269 296.56 0.672601C295.453 0.605934 294.346 0.525933 293.24 0.459265C291.026 0.339264 288.813 0.232596 286.6 0.152595C285.493 0.112594 284.386 0.0859271 283.279 0.05926C282.359 0.032593 281.439 0.0192595 280.519 0.005926H280.173C279.786 0.005926 279.413 0.005926 279.026 0.005926H278.853C278.853 0.005926 278.706 -0.00740751 278.626 0.005926C278.266 0.005926 277.906 0.005926 277.546 0.005926H277.199C276.279 0.0192595 275.359 0.032593 274.439 0.05926C273.333 0.0859271 272.226 0.112594 271.119 0.152595C268.906 0.232596 266.693 0.339264 264.479 0.459265C263.373 0.525933 262.266 0.605934 261.159 0.672601C260.199 0.739269 259.226 0.805937 258.266 0.885938C251.559 1.43261 244.879 2.20596 238.239 3.20597C235.932 3.55264 233.626 3.93931 231.332 4.33932C230.305 4.52599 229.292 4.71266 228.279 4.89932C227.265 5.08599 226.265 5.286 225.252 5.486C215.865 7.33936 206.572 9.65939 197.438 12.4194C89.5436 45.0065 1.66245 139.541 0.00909697 270.383C-0.0575706 275.356 0.2491 280.343 0.702439 285.303C0.755773 288.343 0.862442 291.37 1.02244 294.383C1.40912 301.743 2.08912 309.037 3.0358 316.237C9.38255 364.651 28.1295 409.171 55.9965 446.505C62.2233 454.865 68.93 462.865 76.0368 470.465C80.9302 475.692 86.0236 480.719 91.2903 485.559C128.837 519.986 175.825 544.293 227.919 554.147C230.319 554.6 232.745 555.027 235.172 555.413C248.972 557.653 263.133 558.867 277.533 559C278.359 559 279.186 559 280.013 559H280.159C280.613 559 281.079 559 281.533 559C281.599 559 281.679 559 281.746 559C286.306 558.973 290.84 558.84 295.346 558.6C295.506 558.6 295.653 558.6 295.8 558.573C440.068 550.627 555.163 433.292 559.55 288.09C559.643 285.236 559.683 282.37 559.683 279.49C559.683 268.476 559.043 257.623 557.803 246.943H557.816ZM444.242 356.877C418.295 408.171 348.88 447.305 314.467 380.398C313.787 379.078 313.133 377.744 312.48 376.398C294.653 339.157 290.573 293.596 284.266 253.383C282.479 250.743 280.573 249.809 278.866 250.169C278.533 250.089 278.186 250.076 277.839 250.103C276.413 250.236 274.893 251.249 273.453 253.383C266.919 295.05 262.773 342.45 243.252 380.398C230.119 405.945 211.879 416.025 192.905 415.891C192.545 415.878 192.198 415.878 191.852 415.878C161.238 415.411 128.797 388.451 112.837 356.877C64.3699 261.049 114.277 147.595 211.905 109.874C233.465 101.541 255.679 97.6606 277.546 97.6872C277.986 97.6872 278.426 97.6872 278.866 97.7006H280.173C301.84 97.7272 323.827 101.621 345.174 109.874C442.802 147.595 492.709 261.049 444.242 356.877Z" fill="#090D16"/>
      <!-- Inner Royal Blue Needle -->
      <path d="M309.614 238.235C305.147 245.542 295.36 232.889 290.547 229.782C285.76 226.675 282.027 225.395 278.867 225.342C275.707 225.395 271.96 226.675 267.173 229.782C262.36 232.889 252.573 245.542 248.106 238.235C240.413 225.675 256.213 191.248 263.827 179.808C268.8 172.355 273.08 167.021 277.547 165.661C277.987 165.528 278.427 165.434 278.867 165.381C279.307 165.434 279.747 165.528 280.173 165.661C284.64 167.021 288.92 172.355 293.894 179.808C301.507 191.248 317.307 225.675 309.614 238.235Z" fill="#0457FC"/>
    </g>
  </g>

  <!-- Bottom Elegant "MANAGER" Badge -->
  <g transform="translate(156, 396)">
    <rect width="200" height="38" rx="19" fill="#F4F4F5" stroke="#E4E4E7" stroke-width="1.5" filter="url(#badgeShadow)"/>
    <circle cx="26" cy="19" r="5" fill="#0457FC"/>
    <text x="42" y="24.5" fill="#090D16" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="13" letter-spacing="3.5">MANAGER</text>
  </g>
</svg>
`;

async function run() {
  console.log('Generating White-Theme 180 Manager App Assets & Icons...');

  // 1. Generate brand_favicon.png for Mobile In-App (Loading screen, Login screen)
  const faviconBuffer = Buffer.from(faviconSvg);
  await sharp(faviconBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(mobileAssetsDir, 'brand_favicon.png'));
  console.log('Created: assets/logo/brand_favicon.png (512x512 transparent PNG)');

  // 2. Generate White Theme 512x512 Icon
  const whiteIconBuffer = Buffer.from(whiteThemeIconSvg);
  await sharp(whiteIconBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(playStoreDir, 'icon-512x512.png'));
  console.log('Created: play-store-assets/icon-512x512.png (White Theme)');

  // 3. Update Android Mipmap densities with the new White Theme Icon
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
    await sharp(whiteIconBuffer)
      .resize(d.size, d.size)
      .png({ compressionLevel: 9 })
      .toFile(targetPath);
    console.log(`Updated Android launcher icon: ${d.dir}/ic_launcher.png (${d.size}x${d.size})`);
  }

  // 4. Feature Graphic (1024x500) Highlighting the 3 Pillars
  // - Pillar 1: Autonomous Social Media Manager (Strategy & Growth)
  // - Pillar 2: 1-Platform Hub for Posting Everywhere (IG, YT, TikTok, X, LinkedIn)
  // - Pillar 3: Autonomous Video Editing of YOUR Existing Real Videos (Zero fake avatars, 5CP identity)
  const featureSvg = `
  <svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="featureBg" cx="20%" cy="30%" r="85%">
        <stop offset="0%" stop-color="#141420"/>
        <stop offset="60%" stop-color="#08080C"/>
        <stop offset="100%" stop-color="#000000"/>
      </radialGradient>
      <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38BDF8"/>
        <stop offset="50%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0457FC"/>
        <stop offset="100%" stop-color="#4F46E5"/>
      </linearGradient>
    </defs>

    <rect width="1024" height="500" fill="url(#featureBg)"/>

    <!-- Subtle Grid Lines -->
    <path d="M0 100H1024M0 200H1024M0 300H1024M0 400H1024" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>
    <path d="M200 0V500M400 0V500M600 0V500M800 0V500" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/>

    <!-- Left Header & Value Props -->
    <g transform="translate(64, 55)">
      <!-- Brand Badge with White Theme Icon Mini -->
      <rect width="215" height="36" rx="18" fill="#181822" stroke="#27272A" stroke-width="1"/>
      <circle cx="20" cy="18" r="6" fill="#0457FC"/>
      <text x="36" y="23" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="12" letter-spacing="2">180 MANAGER</text>

      <!-- Main Headline -->
      <text x="0" y="88" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="42" letter-spacing="-1">
        Hire Your Autonomous
      </text>
      <text x="0" y="136" fill="url(#primaryGrad)" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="42" letter-spacing="-1">
        AI Social Media Manager
      </text>

      <text x="0" y="180" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400">
        Scale brand growth, multiply content output &amp; automate editing on your real videos.
      </text>

      <!-- 3 Key Pillars Requested by User -->
      <g transform="translate(0, 215)">
        <!-- Pillar 1 -->
        <g transform="translate(0, 0)">
          <rect width="560" height="62" rx="14" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
          <circle cx="32" cy="31" r="16" fill="#3B82F6" fill-opacity="0.2"/>
          <text x="25" y="36" fill="#38BDF8" font-family="sans-serif" font-weight="bold" font-size="16">1</text>
          <text x="60" y="26" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="14">Dedicated Social Manager</text>
          <text x="60" y="46" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">30-day strategy, growth analytics, psychological hooks &amp; 5CP brand identity</text>
        </g>

        <!-- Pillar 2 -->
        <g transform="translate(0, 72)">
          <rect width="560" height="62" rx="14" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
          <circle cx="32" cy="31" r="16" fill="#10B981" fill-opacity="0.2"/>
          <text x="25" y="36" fill="#10B981" font-family="sans-serif" font-weight="bold" font-size="16">2</text>
          <text x="60" y="26" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="14">1-Platform Hub for Posting Everywhere</text>
          <text x="60" y="46" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Direct 1-click publishing to Instagram, YouTube Shorts, TikTok, X &amp; LinkedIn</text>
        </g>

        <!-- Pillar 3 -->
        <g transform="translate(0, 144)">
          <rect width="560" height="62" rx="14" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
          <circle cx="32" cy="31" r="16" fill="#EC4899" fill-opacity="0.2"/>
          <text x="25" y="36" fill="#EC4899" font-family="sans-serif" font-weight="bold" font-size="16">3</text>
          <text x="60" y="26" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="14">Autonomous Video Editing (Your Real Videos)</text>
          <text x="60" y="46" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">No fake AI avatars: trims silences, ducks audio &amp; styles kinetic brand captions</text>
        </g>
      </g>
    </g>

    <!-- Right White-Theme Phone Mockup -->
    <g transform="translate(685, 40)">
      <rect width="280" height="420" rx="38" fill="#FFFFFF" stroke="#E4E4E7" stroke-width="4"/>
      <rect x="8" y="8" width="264" height="404" rx="30" fill="#000000"/>
      
      <!-- Mockup Header with White Brand Badge -->
      <rect x="25" y="25" width="230" height="52" rx="14" fill="#14141A" stroke="#27272A" stroke-width="1"/>
      <circle cx="50" cy="51" r="14" fill="#0457FC"/>
      <text x="72" y="47" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="13">180 Manager</text>
      <text x="72" y="63" fill="#10B981" font-family="'Segoe UI', Roboto, sans-serif" font-size="10">Active Manager • Online</text>

      <!-- Real Video Editing Canvas Mockup -->
      <rect x="25" y="90" width="230" height="195" rx="16" fill="#121218" stroke="#3F3F46" stroke-width="1"/>
      <circle cx="140" cy="180" r="26" fill="#0457FC"/>
      <polygon points="135,170 152,180 135,190" fill="#FFFFFF"/>
      <rect x="35" y="240" width="130" height="24" rx="6" fill="#0457FC" fill-opacity="0.25"/>
      <text x="44" y="256" fill="#38BDF8" font-family="sans-serif" font-weight="bold" font-size="10">REAL VIDEO • 5CP DNA</text>

      <!-- Post Everywhere Action -->
      <rect x="25" y="300" width="230" height="46" rx="14" fill="url(#btnGrad)"/>
      <text x="50" y="328" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="13">Publish to All 5 Channels</text>
      
      <text x="45" y="375" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">IG • YouTube • TikTok • X • LinkedIn</text>
    </g>
  </svg>
  `;

  await sharp(Buffer.from(featureSvg))
    .resize(1024, 500)
    .png({ compressionLevel: 9 })
    .toFile(path.join(playStoreDir, 'feature-graphic-1024x500.png'));
  console.log('Created: play-store-assets/feature-graphic-1024x500.png (3 Pillars)');

  // 5. Update the 5 Screenshots to explicitly showcase:
  // 1: Hire Your Autonomous Social Media Manager
  // 2: 1-Platform Hub for Posting Everywhere (IG, YT, TikTok, X, LinkedIn)
  // 3: Autonomous Video Editing of Your Real Videos (No fake avatars)
  // 4: 30-Day Growth Content Strategy & Revenue Scaling
  // 5: 5CP Brand Identity & Voice DNA
  const screenshots = [
    {
      filename: 'screenshot-1-content-calendar.png',
      badge: 'PILLAR 1: YOUR AI SOCIAL MANAGER',
      title: 'Hire Your Social Manager',
      subtitle: 'Analyze growth, increase output &amp; automate 30 days of strategy',
      accent: '#0457FC',
      cardTitle: 'Autonomous Content Orchestrator',
      cardPillar: '5 Psychological Hooks • High-Impact Schedule',
      cardMetric: 'Output: +350% Video Velocity'
    },
    {
      filename: 'screenshot-2-teleprompter-script.png',
      badge: 'PILLAR 2: 1-PLATFORM POSTING',
      title: 'Post to All Social Media in 1 Click',
      subtitle: 'Instant simultaneous dispatch to YouTube, IG, TikTok, LinkedIn &amp; X',
      accent: '#10B981',
      cardTitle: 'All 5 Channels Connected &amp; Verified',
      cardPillar: 'YouTube Shorts • Instagram Reels • TikTok • X • LinkedIn',
      cardMetric: '1-Click Multi-Platform Publish'
    },
    {
      filename: 'screenshot-3-media-studio-nle.png',
      badge: 'PILLAR 3: AUTONOMOUS VIDEO EDITING',
      title: 'Edits Your Real Videos',
      subtitle: 'Zero fake AI avatars: cuts silences, ducks audio &amp; styles kinetic captions',
      accent: '#EC4899',
      cardTitle: 'Hardware NLE Timeline Assembly',
      cardPillar: 'AndroidX Media3 Hardware Engine • 60 FPS Full HD',
      cardMetric: 'Real Video Processing • Huge Savings'
    },
    {
      filename: 'screenshot-4-multi-platform-publish.png',
      badge: 'GROWTH &amp; REVENUE ENGINE',
      title: 'Scale Reach &amp; Stack Revenue',
      subtitle: 'High-converting hooks and retention pacing engineered to scale your business',
      accent: '#8B5CF6',
      cardTitle: '0-3s Pattern Interrupt &amp; Retention Loops',
      cardPillar: 'Curiosity Gaps • Contrarian Truths • Viral CTAs',
      cardMetric: 'Retention Score: 96 / 100'
    },
    {
      filename: 'screenshot-5-brand-consciousness.png',
      badge: '5CP BRAND IDENTITY',
      title: '5CP Brand DNA &amp; Creation',
      subtitle: 'Locks in brand colors, typography, logos, and custom voice guidelines',
      accent: '#06B6D4',
      cardTitle: 'Universal Brand Kit Enforcement',
      cardPillar: 'White &amp; Obsidian Identity • 180 Studio Favicon',
      cardMetric: '100% Brand Consistency Guaranteed'
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
          <stop offset="100%" stop-color="#0457FC"/>
        </linearGradient>
      </defs>

      <!-- Deep Background -->
      <rect width="1080" height="1920" fill="url(#screenBg${i})"/>

      <!-- Header with Pill & Headline -->
      <g transform="translate(80, 95)">
        <rect width="360" height="48" rx="24" fill="#18181F" stroke="#27272A" stroke-width="2"/>
        <circle cx="28" cy="24" r="8" fill="${item.accent}"/>
        <text x="48" y="31" fill="#F4F4F5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="15" letter-spacing="1">${item.badge}</text>
        
        <text x="0" y="130" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="54" letter-spacing="-1">${item.title}</text>
        <text x="0" y="180" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="400">${item.subtitle}</text>
      </g>

      <!-- Center Mobile UI Canvas Window -->
      <g transform="translate(80, 360)">
        <rect width="920" height="1440" rx="64" fill="#0C0C10" stroke="#27272A" stroke-width="4"/>
        
        <!-- App Bar with 180 Manager title and live indicator -->
        <rect x="40" y="40" width="840" height="90" rx="24" fill="#14141A" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="85" cy="85" r="22" fill="${item.accent}"/>
        <text x="125" y="93" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="26">180 Manager</text>
        <rect x="730" y="65" width="120" height="40" rx="12" fill="#27272A"/>
        <text x="746" y="90" fill="#10B981" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="15">AI ONLINE</text>

        <!-- Main Feature Card -->
        <rect x="40" y="160" width="840" height="520" rx="36" fill="url(#cardGrad${i})" stroke="#27272A" stroke-width="2"/>
        <rect x="80" y="200" width="240" height="38" rx="19" fill="#1C1C24" stroke="#3F3F46" stroke-width="1"/>
        <text x="100" y="225" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="15">★ VERIFIED FEATURE</text>
        
        <text x="80" y="300" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="34">${item.cardTitle}</text>
        <text x="80" y="350" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="22">${item.cardPillar}</text>
        
        <!-- Video / Mock Visual Section -->
        <rect x="80" y="390" width="760" height="240" rx="24" fill="#000000" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="460" cy="510" r="44" fill="${item.accent}" fill-opacity="0.9"/>
        <polygon points="450,495 480,510 450,525" fill="#FFFFFF"/>
        <text x="120" y="600" fill="#F4F4F5" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="18">${item.cardMetric}</text>

        <!-- Bottom Action Cards -->
        <rect x="40" y="710" width="840" height="180" rx="32" fill="#14141C" stroke="#27272A" stroke-width="1.5"/>
        <circle cx="100" cy="800" r="28" fill="#10B981"/>
        <text x="150" y="790" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="24">Zero Synthetic Avatars: Real Footage NLE</text>
        <text x="150" y="825" fill="#A1A1AA" font-family="'Segoe UI', Roboto, sans-serif" font-size="18">Edits your actual videos with automatic silence removal, audio ducking &amp; captions</text>

        <!-- Primary Action Button -->
        <rect x="40" y="920" width="840" height="110" rx="32" fill="url(#accentGrad${i})"/>
        <text x="290" y="988" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="28">Automate My Social Growth</text>

        <!-- Navigation Dock -->
        <rect x="40" y="1260" width="840" height="110" rx="32" fill="#101016" stroke="#27272A" stroke-width="1.5"/>
        <text x="110" y="1325" fill="${item.accent}" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">📅 Calendar</text>
        <text x="320" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">🎬 Video NLE</text>
        <text x="520" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">📊 Analytics</text>
        <text x="730" y="1325" fill="#71717A" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="22">🚀 Multi-Post</text>
      </g>
    </svg>`;

    await sharp(Buffer.from(screenSvg))
      .resize(1080, 1920)
      .png({ compressionLevel: 9 })
      .toFile(path.join(playStoreDir, item.filename));
    console.log(`Updated Screenshot: ${item.filename} (1080x1920)`);
  }

  console.log('All White-Theme and 3-Pillar assets generated successfully!');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
