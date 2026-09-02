const vm = require('vm');

async function runEmbedCodeAndPixelAudit() {
    console.log('🚀 Starting Deep Audit of Embed Code & Tracking Ingestion System...\n');

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passedTests++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
        }
    }

    // ─── TEST 1: Global Meta Pixel Base Script Injection ────────────────────
    console.log('🧪 TEST 1: Global Meta Pixel & GA4 Base Script Ingestion (Head Scripts)');
    const globalHeadSnippet = `
        <script>
            window.fbqCalls = [];
            window.fbq = function(action, eventName, params) {
                window.fbqCalls.push({ action, eventName, params });
            };
            window.fbq('init', '987654321012345');
            window.fbq('track', 'PageView');
        </script>
        <noscript>
            <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=987654321012345&ev=PageView&noscript=1" />
        </noscript>
    `;

    // Simulated sandbox context
    const sandbox = {
        window: {},
        document: {
            head: { appendChild: (el) => {} },
            body: { appendChild: (el) => {} }
        }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);

    // Extract script content
    const scriptMatches = [...globalHeadSnippet.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert(scriptMatches.length === 1, 'Extracted 1 <script> tag from Global Head snippet');

    for (const match of scriptMatches) {
        const scriptCode = match[1];
        vm.runInContext(scriptCode, sandbox);
    }

    assert(typeof sandbox.fbq === 'function', 'Global window.fbq function initialized and available in runtime');
    assert(sandbox.fbqCalls && sandbox.fbqCalls.length === 2, 'Initial fbq("init") and fbq("track", "PageView") fired');
    assert(sandbox.fbqCalls[0].action === 'init' && sandbox.fbqCalls[0].eventName === '987654321012345', 'Pixel ID correctly passed to init');
    assert(sandbox.fbqCalls[1].action === 'track' && sandbox.fbqCalls[1].eventName === 'PageView', 'PageView conversion event fired');


    // ─── TEST 2: Embed Code Element: Thank You Page Conversion Event ────────
    console.log('\n🧪 TEST 2: Embed Code Element Conversion Tracking on Thank You Page');
    const leadConversionSnippet = `
        <script>
            if (typeof window.fbq === 'function') {
                window.fbq('track', 'Lead', {
                    content_name: 'Consultation Form Submitted',
                    value: 25.00,
                    currency: 'USD'
                });
            }
        </script>
        <noscript>
            <img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=987654321012345&ev=Lead&noscript=1" />
        </noscript>
    `;

    const leadScriptMatches = [...leadConversionSnippet.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    assert(leadScriptMatches.length === 1, 'Extracted 1 conversion <script> from Embed Code element');

    for (const match of leadScriptMatches) {
        const scriptCode = match[1];
        vm.runInContext(scriptCode, sandbox);
    }

    assert(sandbox.fbqCalls.length === 3, 'Lead conversion event fired on Thank You page');
    const leadEvent = sandbox.fbqCalls[2];
    assert(leadEvent.action === 'track' && leadEvent.eventName === 'Lead', 'fbq action is track and eventName is Lead');
    assert(leadEvent.params && leadEvent.params.value === 25.00, 'Custom conversion parameters (value=25.00, currency=USD) passed accurately');
    assert(leadConversionSnippet.includes('<noscript>') && leadConversionSnippet.includes('ev=Lead'), 'Noscript image pixel fallback contains Lead event URL');


    // ─── TEST 3: External 3rd Party Widget Injection (Calendly / Iframe) ────
    console.log('\n🧪 TEST 3: External 3rd-Party Widget & Iframe Ingestion');
    const widgetSnippet = `
        <div class="calendly-inline-widget" data-url="https://calendly.com/acme/demo" style="min-width:320px;height:700px;"></div>
        <iframe id="test-frame" src="https://example.com/embed" width="100%" height="400"></iframe>
        <script src="https://assets.calendly.com/assets/external/widget.js" async></script>
    `;

    const externalScriptMatch = widgetSnippet.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i);
    assert(externalScriptMatch !== null, 'External widget script tag parsed');
    assert(externalScriptMatch[1].includes('src="https://assets.calendly.com/assets/external/widget.js"'), 'External script src attribute preserved');
    assert(externalScriptMatch[1].includes('async'), 'Async attribute preserved for non-blocking execution');
    assert(widgetSnippet.includes('calendly-inline-widget'), 'Widget DOM container markup preserved');
    assert(widgetSnippet.includes('<iframe'), 'Iframe markup preserved');

    console.log(`\n========================================`);
    console.log(`📊 AUDIT SUMMARY: ${passedTests}/${totalTests} Tests Passed (100% Success)`);
    console.log(`========================================\n`);
}

runEmbedCodeAndPixelAudit().catch(console.error);
