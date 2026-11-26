import { titleFor } from './documentTitle';

const t = (key: string) =>
  key === 'web.defaultTitle' ? 'Arriv · Your journey in Australia' : `[${key}]`;

describe('titleFor', () => {
  it('names each section', () => {
    expect(titleFor('/chat', t)).toBe('[tabs.chat] · Arriv');
    expect(titleFor('/conversation/abc', t)).toBe('[tabs.chat] · Arriv');
    expect(titleFor('/privacy', t)).toBe('[legal.privacy.title] · Arriv');
    expect(titleFor('/journey/123/edit', t)).toBe('[journey.title] · Arriv');
  });

  it('does not match a longer word by prefix', () => {
    expect(titleFor('/communityx', t)).toBe('Arriv · Your journey in Australia');
  });

  it('falls back to the tagline', () => {
    expect(titleFor('/welcome', t)).toBe('Arriv · Your journey in Australia');
    expect(titleFor('/', t)).toBe('Arriv · Your journey in Australia');
  });
});
