import { destination } from './format';

const actor = { handle: 'mateorojas' };

describe('destination', () => {
  it('opens the post for comments, replies and likes', () => {
    for (const type of ['comment', 'reply', 'like']) {
      expect(destination({ type, entity_id: 'p1', actor })).toEqual({
        kind: 'href',
        href: '/post/p1',
      });
    }
  });

  it('opens connections, profiles, communities and milestones', () => {
    expect(destination({ type: 'connection_request', entity_id: 'u1', actor })).toEqual({
      kind: 'href',
      href: '/connections',
    });
    expect(destination({ type: 'connection_accepted', entity_id: 'u1', actor })).toEqual({
      kind: 'href',
      href: '/profile/mateorojas',
    });
    expect(destination({ type: 'community_join', entity_id: 'c1', actor })).toEqual({
      kind: 'community',
      id: 'c1',
    });
    expect(destination({ type: 'milestone_reminder', entity_id: 'm1', actor: null })).toEqual({
      kind: 'href',
      href: '/journey/m1',
    });
  });

  it('goes nowhere when something is missing', () => {
    expect(destination({ type: 'connection_accepted', entity_id: 'u1', actor: null })).toBeNull();
    expect(destination({ type: 'like', entity_id: null, actor })).toBeNull();
    expect(destination({ type: 'message', entity_id: 'x', actor })).toBeNull();
  });
});
