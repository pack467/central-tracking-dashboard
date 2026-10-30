import test from 'node:test';
import assert from 'node:assert/strict';
import { safeExternalUrl, safeMailto } from '../app/lib/safe-url.ts';

test('only http(s) addresses may be opened', () => {
  assert.equal(safeExternalUrl('https://www.linkedin.com/in/someone'), 'https://www.linkedin.com/in/someone');
  assert.equal(safeExternalUrl('  http://example.com/a?b=1#c '), 'http://example.com/a?b=1#c');
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', 'file:///etc/passwd', 'ftp://example.com', '//evil.example', '/relative', 'linkedin.com/in/x', '', '   ', null, undefined, 'https://', 'https://user:pass@example.com', 'https://exa mple.com', 'https://example.com/\nSet-Cookie: x', 'https://' + 'a'.repeat(2100) + '.com'])
    assert.equal(safeExternalUrl(bad), undefined, String(bad).slice(0, 40));
});

test('mailto only for a plain address, never extra headers', () => {
  assert.equal(safeMailto('galih@example.com'), 'mailto:galih@example.com');
  assert.equal(safeMailto('first.last+tag@sub.example.co.id'), 'mailto:first.last+tag@sub.example.co.id');
  for (const bad of ['a@b.com?cc=x@y.z', 'a@b.com,c@d.com', 'a@b.com\nBcc: x@y.z', 'a b@c.com', 'not-an-email', '@b.com', 'a@b', '', null, undefined])
    assert.equal(safeMailto(bad), undefined, String(bad));
});
