const test = require('node:test');
const assert = require('node:assert/strict');

const { getTossPaymentConfig } = require('../src/backend/utils/tossPayments');

function withTossKeys(clientKey, secretKey, callback) {
  const originalClientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY;
  const originalSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
  process.env.TOSS_PAYMENTS_CLIENT_KEY = clientKey;
  process.env.TOSS_PAYMENTS_SECRET_KEY = secretKey;

  try {
    callback();
  } finally {
    if (originalClientKey === undefined) delete process.env.TOSS_PAYMENTS_CLIENT_KEY;
    else process.env.TOSS_PAYMENTS_CLIENT_KEY = originalClientKey;
    if (originalSecretKey === undefined) delete process.env.TOSS_PAYMENTS_SECRET_KEY;
    else process.env.TOSS_PAYMENTS_SECRET_KEY = originalSecretKey;
  }
}

test('accepts Toss API individual integration keys', () => {
  withTossKeys('test_ck_example', 'test_sk_example', () => {
    assert.deepEqual(getTossPaymentConfig(), {
      clientKey: 'test_ck_example',
      secretKey: 'test_sk_example'
    });
  });
});

test('rejects Payment Widget keys', () => {
  withTossKeys('test_gck_example', 'test_gsk_example', () => {
    assert.throws(getTossPaymentConfig, /API 개별 연동 키/);
  });
});

test('rejects mixed test and live API keys', () => {
  withTossKeys('test_ck_example', 'live_sk_example', () => {
    assert.throws(getTossPaymentConfig, /테스트\/운영 환경/);
  });
});
