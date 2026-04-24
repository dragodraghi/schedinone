import { describe, it, expect } from 'vitest';
import { isAnnouncementVisibleTo } from '../announcements';
import type { Announcement } from '../types';
import { Timestamp } from 'firebase/firestore';

const base: Announcement = {
  id: 'a1', title: 't', body: 'b', status: 'published',
  authorUid: 'admin', targetUids: null,
  createdAt: Timestamp.now(), publishedAt: Timestamp.now(),
  editedAt: null, deletedAt: null,
};

describe('isAnnouncementVisibleTo', () => {
  it('draft is not visible to players', () => {
    expect(isAnnouncementVisibleTo({ ...base, status: 'draft' }, 'u1')).toBe(false);
  });
  it('deleted is not visible', () => {
    expect(isAnnouncementVisibleTo({ ...base, deletedAt: Timestamp.now() }, 'u1')).toBe(false);
  });
  it('broadcast visible to anyone', () => {
    expect(isAnnouncementVisibleTo(base, 'u1')).toBe(true);
  });
  it('targeted visible only to listed uids', () => {
    expect(isAnnouncementVisibleTo({ ...base, targetUids: ['u2'] }, 'u1')).toBe(false);
    expect(isAnnouncementVisibleTo({ ...base, targetUids: ['u1'] }, 'u1')).toBe(true);
  });
});
