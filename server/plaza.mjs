import { randomUUID } from 'node:crypto';

const PRESENCE_MS = 15_000;
const QUEUE_LIMIT = 20;
const MAX_DURATION = 24 * 60 * 60;

function reject(status, message) {
  throw Object.assign(new Error(message), { status });
}

export function createPlaza({ clock = Date.now } = {}) {
  const viewers = new Map();
  const votes = new Set();
  const queue = [];
  let current = null;

  function advance(time) {
    const next = queue.shift();
    current = next ? { ...next, startedAt: time } : null;
    votes.clear();
  }

  function skipNeeded() {
    // Majority, not half: with 2 viewers both must agree; 3 viewers need 2.
    return Math.max(1, Math.floor(viewers.size / 2) + 1);
  }

  function checkVotes(time) {
    if (current && votes.size >= skipNeeded()) advance(time);
  }

  function updatePresence(viewer, time, leaving = false) {
    for (const [key, lastSeen] of viewers) {
      if (time - lastSeen >= PRESENCE_MS) {
        viewers.delete(key);
        votes.delete(key);
      }
    }
    if (leaving) {
      viewers.delete(viewer);
      votes.delete(viewer);
    } else {
      viewers.set(viewer, time);
    }
    checkVotes(time);
  }

  function snapshot(viewer, time) {
    return {
      now: current ? { ...current } : null,
      queue: queue.map(item => ({ ...item })),
      serverTime: time,
      online: viewers.size,
      skipVotes: votes.size,
      skipNeeded: skipNeeded(),
      voted: votes.has(viewer)
    };
  }

  function matchesCurrent(id) {
    if (typeof id !== 'string' || !id || id.length > 80) reject(400, 'Mã lượt phát không hợp lệ.');
    return current?.id === id;
  }

  return {
    poll(viewer) {
      const time = clock();
      updatePresence(viewer, time);
      return snapshot(viewer, time);
    },
    leave(viewer) {
      const time = clock();
      updatePresence(viewer, time, true);
      return snapshot(viewer, time);
    },
    enqueue(viewer, addedBy, body) {
      const videoId = body?.videoId;
      if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        reject(400, 'Mã video YouTube phải có 11 ký tự.');
      }
      if (body.title != null && (typeof body.title !== 'string' || body.title.length > 200)) {
        reject(400, 'Tên video tối đa 200 ký tự.');
      }
      const time = clock();
      updatePresence(viewer, time);
      if (current?.videoId === videoId || queue.some(item => item.videoId === videoId)) {
        reject(409, 'Video này đang phát hoặc đã có trong hàng đợi.');
      }
      if (queue.length >= QUEUE_LIMIT) reject(409, 'Hàng đợi đã đủ 20 video.');
      const title = (body.title || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || `Video YouTube ${videoId}`;
      queue.push({ id: randomUUID(), videoId, title, addedBy });
      if (!current) advance(time);
      return snapshot(viewer, time);
    },
    skip(viewer, body) {
      const time = clock();
      updatePresence(viewer, time);
      if (matchesCurrent(body?.id)) {
        votes.add(viewer);
        checkVotes(time);
      }
      return snapshot(viewer, time);
    },
    ended(viewer, body) {
      const time = clock();
      updatePresence(viewer, time);
      if (matchesCurrent(body?.id)) {
        const duration = body.duration;
        if (!Number.isFinite(duration) || duration < 1 || duration > MAX_DURATION) {
          reject(400, 'Thời lượng video không hợp lệ.');
        }
        // Allow for player clock drift, including clips shorter than the tolerance.
        const earliestEnd = current.startedAt + Math.max(1, duration - 3) * 1000;
        if (time >= earliestEnd) advance(time);
      }
      return snapshot(viewer, time);
    }
  };
}
