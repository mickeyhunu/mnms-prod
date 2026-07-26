const PIECE_CANCELLATION_LOCK_WINDOW_MS = 10 * 60 * 1000;

function isPieceCancellationLocked(startsAt, now = new Date()) {
  if (!startsAt) return false;
  const startTime = new Date(startsAt).getTime();
  const currentTime = new Date(now).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(currentTime)) return false;
  return currentTime >= startTime - PIECE_CANCELLATION_LOCK_WINDOW_MS;
}

module.exports = {
  PIECE_CANCELLATION_LOCK_WINDOW_MS,
  isPieceCancellationLocked
};
