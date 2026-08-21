import { EmailManagementService } from '@workspace/communications';

async function test() {
    try {
        console.log("Testing getEmailStats...");
        const stats = await EmailManagementService.getEmailStats(undefined as any);
        console.log("Success:", stats);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
