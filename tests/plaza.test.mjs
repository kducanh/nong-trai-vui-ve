import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaza } from '../server/plaza.mjs';

function setup() {
  let time = 1_000_000;
  return { room: createPlaza({ clock: () => time }), tick: ms => { time += ms; } };
}

const A = 'aqUzDzVX9Mo';
const B = 'dQw4w9WgXcQ';
const C = '0O2aH4XLbto';

test('first submission starts immediately, later submissions preserve order and the server clock', () => {
  const { room, tick } = setup();
  const first = room.enqueue('user:12', 'Mai', { videoId: A, title: 'Bài đầu' });
  tick(800);
  room.enqueue('guest:private-token', 'Khách', { videoId: B });
  const view = room.enqueue('user:12', 'Mai', { videoId: C, title: 'Bài ba' });
  assert.deepEqual(view.now, first.now);
  assert.equal(view.serverTime - view.now.startedAt, 800);
  assert.equal(view.online, 2);
  assert.deepEqual(view.queue.map(item => item.videoId), [B, C]);
  assert.equal(view.queue[0].title, `Video YouTube ${B}`);
  assert.equal(view.queue[0].addedBy, 'Khách');
  assert.doesNotMatch(JSON.stringify(view), /user:12|private-token/);
});

test('skip votes count once per active viewer and repeated old requests never skip the next video', () => {
  const { room } = setup();
  const { now } = room.enqueue('u1', 'Mai', { videoId: A });
  room.enqueue('u2', 'Nam', { videoId: B });
  room.poll('u3');
  const vote = room.skip('u1', { id: now.id });
  assert.equal(vote.voted, true);
  assert.equal(vote.skipNeeded, 2);
  assert.equal(vote.skipVotes, 1);
  assert.deepEqual(room.skip('u1', { id: now.id }), vote);
  assert.equal(room.poll('u2').voted, false);
  const advanced = room.skip('u2', { id: now.id });
  assert.equal(advanced.now.videoId, B);
  assert.equal(advanced.skipVotes, 0);
  assert.deepEqual(room.skip('u2', { id: now.id }), advanced);
  assert.equal(room.ended('u3', { id: now.id, duration: 1 }).now.id, advanced.now.id);
});

test('leaving changes the threshold immediately; expiring a viewer removes their vote', () => {
  const { room, tick } = setup();
  const { now } = room.enqueue('first', 'Mai', { videoId: A });
  room.poll('second');
  room.poll('third');
  room.poll('fourth');
  room.skip('first', { id: now.id });
  const twoVotes = room.skip('second', { id: now.id });
  assert.equal(twoVotes.skipNeeded, 3);
  assert.equal(twoVotes.skipVotes, 2);
  // A non-voter leaves: 3 viewers remain, majority is now 2, so the two votes pass.
  const afterLeave = room.leave('third');
  assert.equal(afterLeave.now, null);
  assert.equal(afterLeave.online, 3);
  assert.equal(afterLeave.voted, false);

  const next = room.enqueue('first', 'Mai', { videoId: B });
  room.skip('first', { id: next.now.id });
  tick(9_000);
  room.poll('fourth');
  tick(6_000);
  const expired = room.poll('second');
  assert.equal(expired.online, 2);
  assert.equal(expired.skipVotes, 0);
  assert.equal(expired.now.id, next.now.id);
});

test('only a plausible end report for the current play advances the queue', () => {
  const { room, tick } = setup();
  const { now } = room.enqueue('a', 'Mai', { videoId: A });
  room.enqueue('b', 'Khách', { videoId: B });
  for (const duration of [null, '20', 0, -1, NaN, Infinity, 86_401]) {
    assert.throws(() => room.ended('a', { id: now.id, duration }), { status: 400 });
  }
  tick(16_999);
  assert.equal(room.ended('a', { id: now.id, duration: 20 }).now.id, now.id);
  tick(1);
  const second = room.ended('a', { id: now.id, duration: 20 }).now;
  assert.equal(second.videoId, B);
  assert.equal(second.startedAt, now.startedAt + 17_000);
  assert.equal(room.ended('b', { id: now.id, duration: 20 }).now.id, second.id);
  assert.equal(room.ended('b', { id: second.id, duration: 1 }).now.id, second.id);
  tick(1_000);
  assert.equal(room.ended('b', { id: second.id, duration: 1 }).now, null);
  // The same YouTube video can be replayed; a delayed report from its old play is harmless.
  const replay = room.enqueue('a', 'Mai', { videoId: A });
  assert.notEqual(replay.now.id, now.id);
  assert.equal(room.ended('a', { id: now.id, duration: 20 }).now.id, replay.now.id);
});

test('two viewers need both votes before a skip; one viewer alone needs one', () => {
  const { room } = setup();
  const { now } = room.enqueue('a', 'Mai', { videoId: A });
  room.poll('b');
  let view = room.skip('a', { id: now.id });
  assert.equal(view.skipNeeded, 2);
  assert.equal(view.skipVotes, 1);
  assert.equal(view.now.id, now.id);
  view = room.skip('b', { id: now.id });
  assert.equal(view.now, null);
  room.leave('b');
  const solo = room.enqueue('a', 'Mai', { videoId: B });
  const second = room.enqueue('a', 'Mai', { videoId: C });
  assert.equal(second.skipNeeded, 1);
  assert.equal(room.skip('a', { id: solo.now.id }).now.videoId, C);
});

test('invalid submissions, duplicate videos and a full queue do not change its contents', () => {
  const { room } = setup();
  for (const body of [null, { videoId: 'bad' }, { videoId: {} }, { videoId: A, title: 'x'.repeat(201) }]) {
    assert.throws(() => room.enqueue('a', 'Mai', body), { status: 400 });
  }
  room.enqueue('a', 'Mai', { videoId: A });
  assert.throws(() => room.enqueue('a', 'Mai', { videoId: A }), { status: 409 });
  for (let i = 0; i < 20; i++) room.enqueue('a', 'Mai', { videoId: String(i).padStart(11, '0') });
  const full = room.poll('a');
  assert.equal(full.queue.length, 20);
  assert.throws(() => room.enqueue('a', 'Mai', { videoId: full.queue[0].videoId }), { status: 409 });
  assert.throws(() => room.enqueue('a', 'Mai', { videoId: C }), { status: 409 });
  assert.deepEqual(room.poll('a'), full);
});
