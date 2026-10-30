/** A booking piece's place: its row, and its box within the row. Offsets ignore transforms, so a lift is not a move. */
interface Place {
  row: string;
  left: number;
  top: number;
  width: number;
}

const SNAP: KeyframeAnimationOptions = { duration: 120, easing: 'ease-out', id: 'snap' };

/**
 * Eases bookings into their new places whenever the grid lays them out again: a drag snapping to another day or
 * row, bookings re-stacking around it, a cancelled drop going back. After each render it compares every piece
 * with where it was and animates the difference (FLIP). Pieces are matched by booking and order, since a snap
 * often re-creates them. Places are kept within the row, so a row growing or shrinking above is not a move.
 */
export class SnapAnimation {
  private places = new Map<string, Place>();
  private key = '';
  private readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /** After a render. The key names the layout (days and people); a new one starts afresh, without animating. */
  settle(grid: HTMLElement, key: string): void {
    const places = new Map<string, Place>();
    const count = new Map<string, number>();
    const pieces = [...grid.querySelectorAll<HTMLElement>('[data-booking]')];
    for (const piece of pieces) {
      for (const animation of piece.getAnimations()) if (animation.id === SNAP.id) animation.cancel();
    }
    for (const piece of pieces) {
      const row = piece.closest<HTMLElement>('[data-person-id]')!;
      const booking = piece.dataset['booking']!;
      const n = count.get(booking) ?? 0;
      count.set(booking, n + 1);
      const place = {
        row: row.dataset['personId']!,
        left: piece.offsetLeft,
        top: piece.offsetTop - row.offsetTop,
        width: piece.offsetWidth,
      };
      places.set(`${booking}#${n}`, place);

      const before = key === this.key ? this.places.get(`${booking}#${n}`) : undefined;
      if (before && !this.reducedMotion.matches) this.ease(grid, piece, before, place, row);
    }
    this.places = places;
    this.key = key;
  }

  private ease(grid: HTMLElement, piece: HTMLElement, from: Place, to: Place, row: HTMLElement): void {
    // A piece that changed row moves by the distance between the rows as they are now.
    const fromRow = from.row === to.row ? row : grid.querySelector<HTMLElement>(`[data-person-id="${from.row}"]`);
    const dx = from.left - to.left;
    const dy = (fromRow?.offsetTop ?? row.offsetTop) + from.top - (row.offsetTop + to.top);
    if (dx === 0 && dy === 0 && from.width === to.width) return;
    piece.animate(
      [
        { translate: `${dx}px ${dy}px`, width: `${from.width}px` },
        { translate: '0 0', width: `${to.width}px` },
      ],
      SNAP,
    );
  }
}
