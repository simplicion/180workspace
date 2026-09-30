const path = require('path');
const { Msg91OtpService } = require(path.resolve(__dirname, '../packages/domains/identity-provider/dist/otp/msg91-otp.service.js'));

const cases = [
  { input: '9381420546', expectedE164: '+919381420546', expectedMsg91: '919381420546' },
  { input: '+919381420546', expectedE164: '+919381420546', expectedMsg91: '919381420546' },
  { input: '919381420546', expectedE164: '+919381420546', expectedMsg91: '919381420546' },
  { input: '+1 415 555 2671', expectedE164: '+14155552671', expectedMsg91: '14155552671' },
  { input: '+44 7911 123456', expectedE164: '+447911123456', expectedMsg91: '447911123456' },
  { input: '+971 50 123 4567', expectedE164: '+971501234567', expectedMsg91: '971501234567' },
  { input: '  93814-20546  ', expectedE164: '+919381420546', expectedMsg91: '919381420546' },
  { input: '', expectedE164: '', expectedMsg91: '' }
];

let allPassed = true;
cases.forEach((c, i) => {
  const res = Msg91OtpService.normalizePhone(c.input);
  const pass = res.e164 === c.expectedE164 && res.msg91Mobile === c.expectedMsg91;
  console.log(`Case ${i + 1} [${c.input}]: ${pass ? 'PASS' : 'FAIL'} (e164=${res.e164}, msg91Mobile=${res.msg91Mobile})`);
  if (!pass) allPassed = false;
});

if (allPassed) {
  console.log('ALL PHONE NORMALIZATION TEST CASES PASSED!');
} else {
  process.exit(1);
}
