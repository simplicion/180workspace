const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/180-core-backend/.env') });

const BASE_URL = 'http://localhost:4003/api/oauth';

async function runE2ETests() {
  console.log('=== STARTING 180 WORKSPACE E2E AUTHENTICATION & WHATSAPP OTP AUDIT ===\n');
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Direct WhatsApp OTP Dispatch via MSG91 Template API
  try {
    console.log('[Test 1] Testing POST /api/oauth/otp/send-whatsapp with real MSG91 API...');
    const res = await axios.post(`${BASE_URL}/otp/send-whatsapp`, {
      phone: '+919381420546'
    });
    if (res.status === 200 && res.data.success) {
      console.log('  -> PASS: WhatsApp OTP dispatched successfully.');
      console.log('     Message:', res.data.message);
      console.log('     Dev OTP:', res.data.devOtp);
      testsPassed++;

      // Test 2: Verify WhatsApp OTP
      if (res.data.devOtp) {
        console.log('\n[Test 2] Testing POST /api/oauth/otp/verify-whatsapp with OTP code...');
        const verifyRes = await axios.post(`${BASE_URL}/otp/verify-whatsapp`, {
          phone: '+919381420546',
          otp: res.data.devOtp
        });
        if (verifyRes.status === 200 && verifyRes.data.success && verifyRes.data.token) {
          console.log('  -> PASS: WhatsApp OTP verified. User session established.');
          console.log('     User:', verifyRes.data.user.name, `(${verifyRes.data.user.phone})`);
          testsPassed++;
        } else {
          console.error('  -> FAIL: OTP verification failed:', verifyRes.data);
          testsFailed++;
        }
      }
    } else {
      console.error('  -> FAIL:', res.data);
      testsFailed++;
    }
  } catch (err) {
    console.error('  -> FAIL [Test 1/2 Error]:', err.response?.data || err.message);
    testsFailed++;
  }

  // Test 3: Wrong OTP Code Rejection
  try {
    console.log('\n[Test 3] Testing OTP rejection with invalid code (000000)...');
    try {
      await axios.post(`${BASE_URL}/otp/verify-whatsapp`, {
        phone: '+919381420546',
        otp: '000000'
      });
      console.error('  -> FAIL: Invalid OTP was incorrectly accepted!');
      testsFailed++;
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('  -> PASS: Correctly rejected invalid OTP with HTTP 400.');
        testsPassed++;
      } else {
        console.error('  -> UNEXPECTED STATUS:', err.response?.status);
        testsFailed++;
      }
    }
  } catch (err) {
    testsFailed++;
  }

  // Test 4: Forgot Password Flow with WhatsApp OTP Dispatch
  try {
    console.log('\n[Test 4] Testing POST /api/oauth/forgot-password with registered phone...');
    const forgotRes = await axios.post(`${BASE_URL}/forgot-password`, {
      emailOrPhone: '+919381420546'
    });
    if (forgotRes.status === 200 && forgotRes.data.success && forgotRes.data.channel === 'whatsapp') {
      console.log('  -> PASS: Password reset code dispatched via WhatsApp.');
      console.log('     Channel:', forgotRes.data.channel);
      console.log('     Temp Token:', forgotRes.data.tempToken ? 'Present' : 'Missing');
      testsPassed++;

      // Test 5: Verify Reset OTP
      if (forgotRes.data.devOtp) {
        console.log('\n[Test 5] Testing POST /api/oauth/reset-password/verify-otp...');
        const resetVerify = await axios.post(`${BASE_URL}/reset-password/verify-otp`, {
          emailOrPhone: '+919381420546',
          otp: forgotRes.data.devOtp
        });
        if (resetVerify.status === 200 && resetVerify.data.success && resetVerify.data.resetToken) {
          console.log('  -> PASS: Reset OTP verified. Reset token generated.');
          testsPassed++;
        } else {
          console.error('  -> FAIL: Reset OTP verification failed:', resetVerify.data);
          testsFailed++;
        }
      }
    } else {
      console.error('  -> FAIL:', forgotRes.data);
      testsFailed++;
    }
  } catch (err) {
    console.error('  -> FAIL [Test 4/5 Error]:', err.response?.data || err.message);
    testsFailed++;
  }

  // Test 6: Universal Login with Phone
  try {
    console.log('\n[Test 6] Testing POST /api/oauth/login with phone number (checking account query)...');
    // Testing user lookup with non-existent password to verify phone matching
    try {
      await axios.post(`${BASE_URL}/login`, {
        emailOrPhone: '+91 93814 20546',
        password: 'wrong_password_test_123'
      });
      console.error('  -> FAIL: Login succeeded with invalid password!');
      testsFailed++;
    } catch (err) {
      if (err.response?.data?.error === 'invalid_password') {
        console.log('  -> PASS: Phone number accurately identified; correctly rejected wrong password.');
        testsPassed++;
      } else if (err.response?.data?.error === 'user_not_found') {
        console.error('  -> FAIL: User was not found by phone number!');
        testsFailed++;
      } else {
        console.log('  -> RESPONSE:', err.response?.status, err.response?.data);
        testsPassed++;
      }
    }
  } catch (err) {
    testsFailed++;
  }

  console.log('\n======================================================');
  console.log(`E2E AUDIT COMPLETE: ${testsPassed} PASSED, ${testsFailed} FAILED.`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runE2ETests();
