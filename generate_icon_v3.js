const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resDir = path.join(__dirname, 'apps', 'social-studio-mobile', 'android', 'app', 'src', 'main', 'res');
const playStoreDir = path.join(__dirname, 'play-store-assets');

// ─────────────────────────────────────────────────────────────────────────────
// White-Theme App Icon V3
// - White squircle base
// - "1" and "8" in solid pitch-black
// - The brand 180 Favicon (black ring + blue needle) replaces the "0"
// - "MANAGER" in ALL CAPS stretched edge-to-edge under "180" (from 1 to 0)
// - Rangoli-pattern social media watermarks in corners (IG, FB, X, LinkedIn, Reddit, Pinterest)
//   using their real brand SVG outlines at ~6% opacity
// ─────────────────────────────────────────────────────────────────────────────

const whiteThemeIconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- Clean White Squircle Base -->
  <rect width="512" height="512" rx="114" fill="#FFFFFF"/>
  <rect x="1.5" y="1.5" width="509" height="509" rx="113" stroke="#E4E4E7" stroke-width="2"/>

  <!-- ═══════════════════════════════════════════════════════════════
       RANGOLI SOCIAL WATERMARKS (corners, very faint ~6% opacity)
       Real simplified brand glyphs for each platform
       ═══════════════════════════════════════════════════════════════ -->

  <!-- Top-Left Corner: Instagram (Camera Outline) -->
  <g transform="translate(28, 28) scale(0.55)" opacity="0.06">
    <rect x="6" y="6" width="52" height="52" rx="14" stroke="#000" stroke-width="5" fill="none"/>
    <circle cx="32" cy="32" r="12" stroke="#000" stroke-width="4.5" fill="none"/>
    <circle cx="47" cy="17" r="3.5" fill="#000"/>
  </g>

  <!-- Top-Right Corner: Facebook (F glyph) -->
  <g transform="translate(464, 28) scale(0.55)" opacity="0.06">
    <path d="M32 0C14.3 0 0 14.3 0 32c0 16 11.6 29.2 26.8 31.6V41.2h-8V32h8v-7c0-7.9 4.7-12.3 11.9-12.3 3.5 0 7.1.6 7.1.6v7.8h-4c-3.9 0-5.2 2.4-5.2 5v6h8.7l-1.4 9.2h-7.3V63.6C52.4 61.2 64 48 64 32 64 14.3 49.7 0 32 0z" fill="#000"/>
  </g>

  <!-- Bottom-Left Corner: X / Twitter (X glyph) -->
  <g transform="translate(28, 464) scale(0.5)" opacity="0.06">
    <path d="M38.2 0H45.6L29.4 27.1 48 64H33.5L21.8 41.6 8.4 64H1L18.3 35L0 0H14.9L25.5 20.8 38.2 0zM35.6 57.5H39.6L12.6 5.8H8.3L35.6 57.5z" fill="#000"/>
  </g>

  <!-- Bottom-Right Corner: LinkedIn (in box) -->
  <g transform="translate(464, 464) scale(0.5)" opacity="0.06">
    <path d="M0 4.6C0 2.1 2.1 0 4.6 0H59.4C61.9 0 64 2.1 64 4.6V59.4C64 61.9 61.9 64 59.4 64H4.6C2.1 64 0 61.9 0 59.4V4.6zM19.7 53.3V24.7H10.4V53.3H19.7zM15.1 21C18.3 21 20.2 18.9 20.2 16.3 20.2 13.6 18.3 11.6 15.1 11.6 12 11.6 10 13.6 10 16.3 10 18.9 12 21 15.1 21zM34.6 53.3V37C34.6 36.2 34.7 35.3 34.9 34.7 35.5 33.1 37 31.4 39.5 31.4 42.8 31.4 44.2 34 44.2 37.7V53.3H53.5V36.6C53.5 28 49 24.1 43 24.1 38.1 24.1 35.8 26.8 34.6 28.8V24.7H25.3C25.5 27.3 25.3 53.3 25.3 53.3H34.6z" fill="#000"/>
  </g>

  <!-- Top-Center-Right: Reddit (Snoo head outline) -->
  <g transform="translate(400, 50) scale(0.4)" opacity="0.04">
    <circle cx="32" cy="32" r="30" stroke="#000" stroke-width="4" fill="none"/>
    <circle cx="22" cy="30" r="4" fill="#000"/>
    <circle cx="42" cy="30" r="4" fill="#000"/>
    <path d="M22 42 C27 48 37 48 42 42" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>

  <!-- Top-Center-Left: Pinterest (P outline) -->
  <g transform="translate(50, 50) scale(0.4)" opacity="0.04">
    <circle cx="32" cy="32" r="30" stroke="#000" stroke-width="4" fill="none"/>
    <path d="M26 56C28 47 30 41 32 34 30 30 28 25 32 18 36 12 44 14 44 22 44 28 40 36 38 40 42 40 46 36 48 32" stroke="#000" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- Side subtle watermarks: IG rotated small in bottom-center-left -->
  <g transform="translate(80, 440) scale(0.3) rotate(-15)" opacity="0.035">
    <rect x="6" y="6" width="52" height="52" rx="14" stroke="#000" stroke-width="5" fill="none"/>
    <circle cx="32" cy="32" r="12" stroke="#000" stroke-width="4.5" fill="none"/>
  </g>

  <!-- Side subtle watermarks: FB small in top-center -->
  <g transform="translate(245, 32) scale(0.28) rotate(8)" opacity="0.03">
    <path d="M32 0C14.3 0 0 14.3 0 32c0 16 11.6 29.2 26.8 31.6V41.2h-8V32h8v-7c0-7.9 4.7-12.3 11.9-12.3 3.5 0 7.1.6 7.1.6v7.8h-4c-3.9 0-5.2 2.4-5.2 5v6h8.7l-1.4 9.2h-7.3V63.6C52.4 61.2 64 48 64 32 64 14.3 49.7 0 32 0z" fill="#000"/>
  </g>

  <!-- ═══════════════════════════════════════════════════════════════
       MAIN "180" MONOGRAM WITH BRAND FAVICON AS "0"
       ═══════════════════════════════════════════════════════════════ -->

  <g transform="translate(48, 120)">
    <!-- Number "1" in Solid Pitch Black -->
    <path d="M42 176V34L18 52V20L48 0H74V176H42Z" fill="#090D16"/>

    <!-- Number "8" in Solid Pitch Black -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="M166 0C194 0 216 18 216 44C216 62 202 78 186 84C206 90 222 108 222 132C222 160 196 176 166 176C136 176 110 160 110 132C110 108 126 90 146 84C130 78 116 62 116 44C116 18 138 0 166 0ZM166 30C152 30 142 39 142 48C142 58 152 68 166 68C180 68 190 58 190 48C190 39 180 30 166 30ZM166 98C150 98 138 109 138 123C138 137 150 146 166 146C182 146 194 137 194 123C194 109 182 98 166 98Z" fill="#090D16"/>

    <!-- "0" = Brand Favicon Glyph -->
    <g transform="translate(240, -8) scale(0.34)">
      <path d="M557.816 246.943C555.296 225.142 550.256 204.102 542.99 184.128C536.936 167.395 529.309 151.395 520.283 136.314C514.829 127.168 508.856 118.368 502.416 109.941C489.749 93.3672 475.269 78.247 459.282 64.9001C422.788 35.0997 378.894 14.6595 332.467 5.486C331.453 5.286 330.453 5.08599 329.44 4.89932C328.427 4.71266 327.413 4.52599 326.387 4.33932C324.093 3.93931 321.787 3.55264 319.48 3.20597C312.84 2.20596 306.16 1.43261 299.453 0.885938C298.493 0.805937 297.52 0.739269 296.56 0.672601C295.453 0.605934 294.346 0.525933 293.24 0.459265C291.026 0.339264 288.813 0.232596 286.6 0.152595C285.493 0.112594 284.386 0.0859271 283.279 0.05926C282.359 0.032593 281.439 0.0192595 280.519 0.005926H280.173C279.786 0.005926 279.413 0.005926 279.026 0.005926H278.853C278.853 0.005926 278.706 -0.00740751 278.626 0.005926C278.266 0.005926 277.906 0.005926 277.546 0.005926H277.199C276.279 0.0192595 275.359 0.032593 274.439 0.05926C273.333 0.0859271 272.226 0.112594 271.119 0.152595C268.906 0.232596 266.693 0.339264 264.479 0.459265C263.373 0.525933 262.266 0.605934 261.159 0.672601C260.199 0.739269 259.226 0.805937 258.266 0.885938C251.559 1.43261 244.879 2.20596 238.239 3.20597C235.932 3.55264 233.626 3.93931 231.332 4.33932C230.305 4.52599 229.292 4.71266 228.279 4.89932C227.265 5.08599 226.265 5.286 225.252 5.486C215.865 7.33936 206.572 9.65939 197.438 12.4194C89.5436 45.0065 1.66245 139.541 0.00909697 270.383C-0.0575706 275.356 0.2491 280.343 0.702439 285.303C0.755773 288.343 0.862442 291.37 1.02244 294.383C1.40912 301.743 2.08912 309.037 3.0358 316.237C9.38255 364.651 28.1295 409.171 55.9965 446.505C62.2233 454.865 68.93 462.865 76.0368 470.465C80.9302 475.692 86.0236 480.719 91.2903 485.559C128.837 519.986 175.825 544.293 227.919 554.147C230.319 554.6 232.745 555.027 235.172 555.413C248.972 557.653 263.133 558.867 277.533 559C278.359 559 279.186 559 280.013 559H280.159C280.613 559 281.079 559 281.533 559C281.599 559 281.679 559 281.746 559C286.306 558.973 290.84 558.84 295.346 558.6C295.506 558.6 295.653 558.6 295.8 558.573C440.068 550.627 555.163 433.292 559.55 288.09C559.643 285.236 559.683 282.37 559.683 279.49C559.683 268.476 559.043 257.623 557.803 246.943H557.816ZM444.242 356.877C418.295 408.171 348.88 447.305 314.467 380.398C313.787 379.078 313.133 377.744 312.48 376.398C294.653 339.157 290.573 293.596 284.266 253.383C282.479 250.743 280.573 249.809 278.866 250.169C278.533 250.089 278.186 250.076 277.839 250.103C276.413 250.236 274.893 251.249 273.453 253.383C266.919 295.05 262.773 342.45 243.252 380.398C230.119 405.945 211.879 416.025 192.905 415.891C192.545 415.878 192.198 415.878 191.852 415.878C161.238 415.411 128.797 388.451 112.837 356.877C64.3699 261.049 114.277 147.595 211.905 109.874C233.465 101.541 255.679 97.6606 277.546 97.6872C277.986 97.6872 278.426 97.6872 278.866 97.7006H280.173C301.84 97.7272 323.827 101.621 345.174 109.874C442.802 147.595 492.709 261.049 444.242 356.877Z" fill="#090D16"/>
      <path d="M309.614 238.235C305.147 245.542 295.36 232.889 290.547 229.782C285.76 226.675 282.027 225.395 278.867 225.342C275.707 225.395 271.96 226.675 267.173 229.782C262.36 232.889 252.573 245.542 248.106 238.235C240.413 225.675 256.213 191.248 263.827 179.808C268.8 172.355 273.08 167.021 277.547 165.661C277.987 165.528 278.427 165.434 278.867 165.381C279.307 165.434 279.747 165.528 280.173 165.661C284.64 167.021 288.92 172.355 293.894 179.808C301.507 191.248 317.307 225.675 309.614 238.235Z" fill="#0457FC"/>
    </g>
  </g>

  <!-- ═══════════════════════════════════════════════════════════════
       "MANAGER" TEXT - Stretched edge-to-edge under "180"
       Spans from "1" left edge to "0" right edge
       ═══════════════════════════════════════════════════════════════ -->
  <text 
    x="256" y="340" 
    fill="#090D16" 
    font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    font-weight="900" 
    font-size="55"
    letter-spacing="28"
    text-anchor="middle"
    textLength="342"
    lengthAdjust="spacing"
  >MANAGER</text>

  <!-- Subtle brand accent line under MANAGER -->
  <line x1="90" y1="356" x2="422" y2="356" stroke="#0457FC" stroke-width="3" stroke-linecap="round" opacity="0.5"/>

  <!-- Small "Social Media" subtitle centered -->
  <text 
    x="256" y="385" 
    fill="#71717A" 
    font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    font-weight="600" 
    font-size="16"
    letter-spacing="5"
    text-anchor="middle"
  >SOCIAL MEDIA</text>

  <!-- Blue accent dot -->
  <circle cx="256" cy="410" r="4" fill="#0457FC"/>
</svg>
`;

async function run() {
  console.log('Generating Final White-Theme 180 Manager Icon with MANAGER text & Rangoli watermarks...');

  const iconBuffer = Buffer.from(whiteThemeIconSvg);

  // 1. Play Store 512x512
  await sharp(iconBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(playStoreDir, 'icon-512x512.png'));
  console.log('Created: play-store-assets/icon-512x512.png (512x512, White Theme V3)');

  // 2. Android mipmap densities
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
    await sharp(iconBuffer)
      .resize(d.size, d.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher.png'));
    console.log(`Updated: ${d.dir}/ic_launcher.png (${d.size}x${d.size})`);
  }

  console.log('All icons updated with MANAGER text & Rangoli social watermarks!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
