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
                    if (parsed.type === 'USER_INPUT' || parsed.type === 'PLANNER_RESPONSE') {
                        const content = (parsed.content || parsed.thinking || '').toLowerCase();
                        if ((content.includes('r2 storage') || content.includes('per gb')) && content.includes('documents')) {
                            console.log(`Found in ${folder} (step ${parsed.step_index}):`);
                            console.log(content.substring(0, 1500));
                            console.log('---');
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }
}

search().catch(console.error);
