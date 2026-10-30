const TIMES = ['once', 'twice'];

/** What a review round badge means: round 2 is the first time the work was sent back for changes (D20). */
export function reviewRoundLabel(round: number): string {
  const sentBack = round - 1;
  return `Review round ${round}: sent back for changes ${TIMES[sentBack - 1] ?? `${sentBack} times`}`;
}
