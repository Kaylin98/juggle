import { reviewRoundLabel } from './review-round';

describe('reviewRoundLabel', () => {
  it('counts the times the work was sent back for changes', () => {
    expect(reviewRoundLabel(2)).toBe('Review round 2: sent back for changes once');
    expect(reviewRoundLabel(3)).toBe('Review round 3: sent back for changes twice');
    expect(reviewRoundLabel(4)).toBe('Review round 4: sent back for changes 3 times');
    expect(reviewRoundLabel(6)).toBe('Review round 6: sent back for changes 5 times');
  });
});
