/**
 * Toss Payments 승인 API 통신과 설정 검증을 담당한다.
 */
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

function getTossPaymentConfig() {
  const clientKey = String(process.env.TOSS_PAYMENTS_CLIENT_KEY || '').trim();
  const secretKey = String(process.env.TOSS_PAYMENTS_SECRET_KEY || '').trim();

  if (!clientKey || !secretKey) {
    const error = new Error('결제 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해주세요.');
    error.status = 503;
    throw error;
  }

  return { clientKey, secretKey };
}

async function confirmTossPayment({ paymentKey, orderId, amount }) {
  const { secretKey } = getTossPaymentConfig();
  const response = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paymentKey, orderId, amount })
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || '결제 승인에 실패했습니다.');
    error.status = response.status >= 500 ? 502 : 400;
    error.code = result.code || 'TOSS_CONFIRM_FAILED';
    throw error;
  }

  return result;
}

module.exports = { getTossPaymentConfig, confirmTossPayment };
