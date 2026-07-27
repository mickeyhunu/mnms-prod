const PIECE_TEMPLATE_START = '<!-- PIECE_TEMPLATE_START -->';
const PIECE_TEMPLATE_END = '<!-- PIECE_TEMPLATE_END -->';
const PIECE_DURATION_MS = 9 * 60 * 60 * 1000;

function parseTemplateRows(content) {
  const rawContent = String(content || '');
  const startIndex = rawContent.indexOf(PIECE_TEMPLATE_START);
  const endIndex = rawContent.indexOf(PIECE_TEMPLATE_END);
  if (startIndex === -1 || endIndex < startIndex) return new Map();
  return rawContent.slice(startIndex + PIECE_TEMPLATE_START.length, endIndex).split('\n').reduce((rows, rawLine) => {
    const line = rawLine.trim();
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) return rows;
    rows.set(line.slice(0, separatorIndex).replace(/^[^\w가-힣]+\s*/, '').trim(), line.slice(separatorIndex + 1).trim());
    return rows;
  }, new Map());
}

function parseDateTime(value) {
  const normalized = String(value || '').replace(/년|월/g, '-').replace(/일/g, '').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?.*?(?:UTC|GMT)([+-]\d{2}):(\d{2})/i)
    || normalized.match(/^(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = '0', minute = '0', offsetHour, offsetMinute] = match;
  const values = [year, month, day, hour, minute].map(Number);
  if (values.some((item) => !Number.isInteger(item))) return null;
  const [dateYear, dateMonth, dateDay, dateHour, dateMinute] = values;
  if (offsetHour && offsetMinute) {
    const sign = offsetHour.startsWith('-') ? -1 : 1;
    const offset = sign * ((Math.abs(Number(offsetHour)) * 60) + Number(offsetMinute));
    return new Date(Date.UTC(dateYear, dateMonth - 1, dateDay, dateHour, dateMinute) - (offset * 60 * 1000));
  }
  const date = new Date(dateYear, dateMonth - 1, dateDay, dateHour, dateMinute);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolvePieceChatLifecycle(post, now = new Date(), participantCount = null) {
  const rows = parseTemplateRows(post?.content);
  const startsAt = parseDateTime(rows.get('시간') || rows.get('날짜/시간') || rows.get('일정') || rows.get('만남 시간'));
  const capacity = rows.get('인원') || '';
  const minimumParticipantCount = Math.max(1, Number(capacity.split('/')[0].match(/\d+/)?.[0]) || 1);
  const closedAt = post?.pieceClosedAt || post?.piece_closed_at || null;
  const autoEndsAt = startsAt ? new Date(startsAt.getTime() + PIECE_DURATION_MS) : null;
  const closedDate = closedAt ? new Date(closedAt) : null;
  const hasStarted = Boolean(startsAt && startsAt <= now);
  const totalParticipantCount = participantCount === null ? null : participantCount + 1;
  const isCancelled = !closedAt && hasStarted && totalParticipantCount !== null && totalParticipantCount < minimumParticipantCount;
  const isEnded = Boolean(closedAt || isCancelled || (autoEndsAt && autoEndsAt <= now));
  const isInProgress = Boolean(startsAt && startsAt <= now && !isEnded);
  const endedAt = closedDate && !Number.isNaN(closedDate.getTime()) ? closedDate : (isCancelled ? startsAt : autoEndsAt);
  return {
    status: isCancelled ? 'CANCELLED' : (isEnded ? 'ENDED' : (isInProgress ? 'IN_PROGRESS' : 'RECRUITING')),
    isInProgress,
    isEnded,
    isCancelled,
    canChat: !isEnded,
    minimumParticipantCount,
    totalParticipantCount,
    startsAt: startsAt?.toISOString() || null,
    endedAt: isEnded ? endedAt?.toISOString() || null : null
  };
}

function lifecycleMessages(lifecycle) {
  const messages = [];
  if (!lifecycle.isCancelled && (lifecycle.isInProgress || lifecycle.isEnded)) {
    messages.push({ id: -1, userId: null, nickname: '조각안내', messageType: 'SYSTEM', content: '조각이 시작되었습니다.', createdAt: lifecycle.startsAt });
  }
  if (lifecycle.isEnded) {
    messages.push({ id: -2, userId: null, nickname: '조각안내', messageType: 'SYSTEM', content: lifecycle.isCancelled ? '최소 인원 미달로 조각이 취소되었습니다.' : '조각이 종료되었습니다.', createdAt: lifecycle.endedAt });
  }
  return messages;
}

module.exports = { resolvePieceChatLifecycle, lifecycleMessages };
