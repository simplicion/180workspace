const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels(apiKey) {
    console.log('Testing with key:', apiKey?.substring(0, 10) + '...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const candidateModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-pro'
    ];

    for (const modelName of candidateModels) {
        try {
            console.log(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'Connection Successful'");
            const text = result.response.text();
            console.log(`✅ SUCCESS with model ${modelName}:`, text);
            return { success: true, model: modelName, text };
        } catch (err) {
            console.log(`❌ Failed with model ${modelName}:`, err.message);
        }
    }
}

// Test with dummy key or env
testModels(process.env.GEMINI_API_KEY || 'DUMMY_KEY_FOR_TESTING');
