/**
 * 파일 역할: 백엔드에서 공통 응답 포맷/헬퍼 로직을 제공하는 유틸리티 파일.
 */
function pickUserRow(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    isAdmin: user.role === 'ADMIN'
  };
}

module.exports = { pickUserRow };
