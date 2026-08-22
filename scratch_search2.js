const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\saavi\\.gemini\\antigravity-ide\\brain';

async function search() {
    const folders = fs.readdirSync(brainDir);
    for (const folder of folders) {
        const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript_full.jsonl');
        if (fs.existsSync(transcriptPath)) {
            const fileStream = fs.createReadStream(transcriptPath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                try {
                    const parsed = JSON.parse(line);
                    const content = JSON.stringify(parsed).toLowerCase();
                    if (content.includes('psychology') && content.includes('pricing')) {
                        console.log(`Found in ${folder}:`);
                        let output = parsed.content || parsed.thinking || "no content field";
                        if (output) {
                            console.log(output.substring(0, 1000) + '...');
                        }
                        console.log('---');
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }
}

search().catch(console.error);
