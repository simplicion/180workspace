const Razorpay = require('razorpay');
require('dotenv').config({ path: '../apps/backend/.env' });

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function main() {
    console.log("Testing Razorpay Subscriptions API structure...");
    // Just looking up the method signature or creating a dummy plan
    try {
        const plans = await rzp.plans.all({ count: 1 });
        console.log("Plans fetch successful.", plans);
    } catch(e) {
        console.error(e);
    }
}
main();
