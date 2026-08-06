import { describe, it, expect } from 'vitest';
import {
  getMediaExt,
  isPdf,
  getDocDisplayName,
  getDocExt,
  getDocExtBadge,
  getPdfFirstPageUrl,
  resolveReplyType,
  resolveReply,
  UNAVAILABLE_LABEL,
  REPLY_LABELS,
} from '@/lib/chatMedia';
import type { ChatMessageLike } from '@/lib/chatMedia';

describe('getMediaExt', () => {
  it('maps known types to extensions', () => {
    expect(getMediaExt('image')).toBe('jpg');
    expect(getMediaExt('video')).toBe('mp4');
    expect(getMediaExt('document')).toBe('pdf');
  });

  it('falls back to bin for unknown types', () => {
    expect(getMediaExt('voice')).toBe('bin');
  });
});

describe('isPdf', () => {
  it('detects pdf by mimeType', () => {
    expect(isPdf({ mimeType: 'application/pdf', url: 'https://x/y' })).toBe(true);
  });

  it('detects pdf by filename extension', () => {
    expect(isPdf({ filename: 'report.PDF', url: 'https://x/y' })).toBe(true);
  });

  it('detects pdf by url', () => {
    expect(isPdf({ url: 'https://x/report.pdf' })).toBe(true);
  });

  it('returns false for non-pdf', () => {
    expect(isPdf({ filename: 'a.txt', mimeType: 'text/plain', url: 'https://x/a' })).toBe(false);
  });
});

describe('getDocDisplayName', () => {
  it('prefers a real filename', () => {
    expect(getDocDisplayName({ filename: 'cv.pdf', url: 'https://x/1' })).toBe('cv.pdf');
  });

  it('ignores url-looking filenames', () => {
    expect(getDocDisplayName({ filename: 'https://res.cloudinary.com/x/raw/upload/v1/cv.pdf', url: 'https://res.cloudinary.com/x/raw/upload/v1/cv.pdf' })).toBe('cv.pdf');
  });

  it('derives the name from a cloudinary url path', () => {
    expect(getDocDisplayName({ url: 'https://res.cloudinary.com/demo/raw/upload/v123/my%20doc.pdf' })).toBe('my doc.pdf');
  });

  it('falls back to Document', () => {
    expect(getDocDisplayName({ url: 'https://x/' })).toBe('Document');
  });
});

describe('getDocExt', () => {
  it('detects pdf/doc/xls/ppt', () => {
    expect(getDocExt({ url: 'a.pdf' })).toBe('PDF');
    expect(getDocExt({ filename: 'a.DOCX', url: 'https://x/a.docx' })).toBe('DOC');
    expect(getDocExt({ mimeType: 'application/vnd.ms-excel', url: 'https://x/a' })).toBe('XLS');
    expect(getDocExt({ filename: 'deck.pptx', url: 'https://x/deck.pptx' })).toBe('PPT');
  });

  it('falls back to raw extension', () => {
    expect(getDocExt({ filename: 'notes.txt', url: 'https://x/notes.txt' })).toBe('TXT');
  });

  it('falls back to FILE', () => {
    expect(getDocExt({ url: 'noextension' })).toBe('FILE');
  });
});

describe('getDocExtBadge', () => {
  it('returns colored badge classes per type', () => {
    expect(getDocExtBadge('PDF')).toContain('red');
    expect(getDocExtBadge('DOC')).toContain('blue');
    expect(getDocExtBadge('XLS')).toContain('green');
    expect(getDocExtBadge('PPT')).toContain('orange');
  });

  it('returns neutral badge for unknown', () => {
    expect(getDocExtBadge('TXT')).toContain('foreground');
  });
});

describe('getPdfFirstPageUrl', () => {
  it('returns null for non-cloudinary urls', () => {
    expect(getPdfFirstPageUrl({ url: 'https://cdn.example.com/a.pdf' })).toBeNull();
  });

  it('returns null when no cloud name matches', () => {
    expect(getPdfFirstPageUrl({ url: 'https://res.cloudinary.com/other/upload/a.pdf' })).toBeNull();
  });

  it('builds a fetch transform url for cloudinary raw uploads', () => {
    const url = 'https://res.cloudinary.com/demo/raw/upload/v1/doc.pdf';
    const out = getPdfFirstPageUrl({ url });
    expect(out).toBe(`https://res.cloudinary.com/demo/image/fetch/pg_1,w_300,f_jpg,q_auto/${encodeURIComponent(url)}`);
  });
});

describe('resolveReplyType', () => {
  it('returns text for missing/invalid replyTo', () => {
    expect(resolveReplyType(null, [])).toBe('text');
    expect(resolveReplyType({ _id: undefined }, [])).toBe('text');
  });

  it('returns unsupported for deleted originals', () => {
    expect(resolveReplyType({ _id: '1', deleted: true }, [])).toBe('unsupported');
  });

  it('prefers persisted messageType', () => {
    expect(resolveReplyType({ _id: '1', messageType: 'voice' }, [])).toBe('voice');
  });

  it('falls back to legacy mediaType', () => {
    expect(resolveReplyType({ _id: '1', mediaType: 'document' }, [])).toBe('document');
  });

  it('resolves from the loaded message list', () => {
    const messages: ChatMessageLike[] = [{ _id: '1', media: [{ type: 'video', url: 'x' }] }];
    expect(resolveReplyType({ _id: '1' }, messages)).toBe('video');
  });

  it('defaults to text', () => {
    expect(resolveReplyType({ _id: '1' }, [])).toBe('text');
  });
});

describe('resolveReply', () => {
  it('returns null for non-replies', () => {
    expect(resolveReply(null, [])).toBeNull();
    expect(resolveReply({}, [])).toBeNull();
  });

  it('shows unavailable label for deleted originals', () => {
    const r = resolveReply({ _id: '1', deleted: true, sender: { name: 'Ann' } }, []);
    expect(r?.text).toBe(UNAVAILABLE_LABEL);
    expect(r?.type).toBe('unsupported');
  });

  it('uses caption when present', () => {
    const r = resolveReply({ _id: '1', caption: 'hello', sender: { name: 'Ann' }, messageType: 'text' }, []);
    expect(r?.text).toBe('hello');
    expect(r?.senderName).toBe('Ann');
  });

  it('shows filename for documents without caption', () => {
    const r = resolveReply({ _id: '1', filename: 'cv.pdf', sender: {}, messageType: 'document' }, []);
    expect(r?.text).toBe('cv.pdf');
  });

  it('falls back to the type label', () => {
    const r = resolveReply({ _id: '1', sender: {}, messageType: 'image' }, []);
    expect(r?.text).toBe(REPLY_LABELS.image);
  });

  it('inherits media/filename from the loaded original', () => {
    const messages: ChatMessageLike[] = [
      { _id: '1', media: [{ type: 'document', url: 'https://x/d.pdf', filename: 'd.pdf' }] },
    ];
    const r = resolveReply({ _id: '1', sender: { name: 'Ann' } }, messages);
    expect(r?.type).toBe('document');
    expect(r?.filename).toBe('d.pdf');
    expect(r?.mediaUrl).toBe('https://x/d.pdf');
  });
});
