
const crypto = require('crypto');

const rawBodyBuffer = Buffer.from(JSON.stringify({
  event: 'subscription.charged',
  payload: {
    subscription: {
      entity: {
        id: 'sub_test_123',
        notes: {
          companyId: 'company_123',
          planId: 'plan_123'
        }
      }
    }
  }
}));

const secret = 'testsecret';
const signature = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');

// Simulate the logic in RazorpayPlatformProvider.verifyWebhook
function verifyWebhook(rawBody, headers, webhookSecret) {
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

    if (expectedSignature !== headers['x-razorpay-signature']) {
        throw new Error('Invalid Razorpay webhook signature');
    }

    const payloadObj = JSON.parse(rawBody);
    return payloadObj.event;
}

try {
    const result = verifyWebhook(rawBodyBuffer, { 'x-razorpay-signature': signature }, secret);
    console.log('Success, event parsed:', result);
} catch(e) {
    console.error('Failed!', e);
}

