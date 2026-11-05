import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = { URL, window: { addEventListener() {} } };
runInNewContext(readFileSync(new URL('../assets/plaza.js', import.meta.url), 'utf8'), context);
const { youtubeId } = context.window.Plaza;
const id = 'aB_123-xYz0';

test('extracts a YouTube video ID from each supported sharing URL', () => {
  for (const value of [
    id, ` \t${id} `, `https://youtu.be/${id}?si=abc`, `youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?t=99&v=${id}#top`, `https://www.youtube.com/shorts/${id}/`,
    `https://youtube.com/live/${id}`, `https://youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
  ]) assert.equal(youtubeId(value), id, value);
});

test('rejects untrusted origins, credential tricks and malformed embed paths', () => {
  for (const value of [
    '', 'not an id', id + 'Z', `https://youtube.com.evil.test/watch?v=${id}`,
    `https://evil.test/https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com@evil.test/watch?v=${id}`, `https://evil.test@youtube.com/watch?v=${id}`,
    `ftp://youtube.com/watch?v=${id}`, `https://youtube.com:8123/watch?v=${id}`,
    `https://youtu.be/${id}Z`, `https://youtu.be/${id}/extra`,
    `https://youtube.com/watch?v=${id}%2F`, `https://youtube-nocookie.com/watch?v=${id}`
  ]) assert.equal(youtubeId(value), null, value);
});

