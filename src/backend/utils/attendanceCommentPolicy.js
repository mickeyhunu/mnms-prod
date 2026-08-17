/**
 * 파일 역할: 출근자 코멘트에 노출되면 안 되는 개인정보/서비스 관련 표현을 검증합니다.
 */
const BLOCKED_ATTENDANCE_COMMENT_EXPRESSIONS = Object.freeze([
  '마인드',
  'ㅁㅇㄷ',
  '수위',
  'ㅅㅇ',
  '배팅',
  '베팅',
  'ㅂㅌ',
  '전투',
  'ㅈㅌ',
  '성관계',
  '성행위',
  '번호',
  '전번',
  '폰번',
  '연락처',
  '연락',
  '휴대폰',
  '핸드폰',
  '카톡',
  '카카오톡',
  '텔레그램',
  '인스타',
  '인스타그램',
  '라인아이디',
  'sns',
  '실명',
  '본명',
  '주소',
  '학교',
  '직장',
  '거주지',
  '사이즈',
  '가슴',
  '컵사이즈',
  '몸무게'
]);

function normalizeForAttendanceCommentScan(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]+/g, '');
}

function findBlockedAttendanceCommentExpression(value) {
  const normalized = normalizeForAttendanceCommentScan(value);
  if (!normalized) return null;

  return BLOCKED_ATTENDANCE_COMMENT_EXPRESSIONS.find((expression) => (
    normalized.includes(normalizeForAttendanceCommentScan(expression))
  )) || null;
}

module.exports = {
  BLOCKED_ATTENDANCE_COMMENT_EXPRESSIONS,
  findBlockedAttendanceCommentExpression
};
