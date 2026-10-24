// The want list: empty album slots a collector is hunting for, to take to a
// coin show or shop. Stored per account in the want_list table; this module
// turns those rows into the list on screen and the text that gets shared.
// A slot that's filled drops off the list by itself.
import type { Album, AlbumSlot } from '../types/album';
import type { Coin } from '../types/coin';
import { albumInView, albumSlotName, buildAlbums } from '../data/albums';
import { computeAlbumFills } from './albumFills';

export interface WantEntry {
  albumId: string;
  slotId: string;
  createdAt?: string;
}

/** Where wants are kept. Both apps back this with the want_list table. */
export interface WantListStore {
  load(): Promise<WantEntry[]>;
  add(albumId: string, slotId: string): Promise<void>;
  remove(albumId: string, slotId: string): Promise<void>;
}

export interface WantItem {
  albumId: string;
  slot: AlbumSlot;
  /** e.g. "1916-D", or "1999 Delaware · D" for a design slot. */
  title: string;
  /** The slot's second line, if any ("Mint sets only", "Westward Journey"). */
  note: string | null;
  year: number | null;
}

export interface WantGroup {
  album: Album;
  items: WantItem[];
}

export function wantKey(albumId: string, slotId: string): string {
  return `${albumId}/${slotId}`;
}

function slotYear(slot: AlbumSlot): number | null {
  return slot.match.kind === 'country' ? null : slot.match.year;
}

function itemTitle(slot: AlbumSlot): string {
  const name = albumSlotName(slot);
  const year = slotYear(slot);
  return year !== null && !name.includes(String(year)) ? `${year} ${name}` : name;
}

/**
 * The open wants, grouped by album in album order, each in slot order. Slots
 * that are now filled, and ids that no longer exist, are left out.
 */
export function resolveWantList(
  entries: WantEntry[],
  coins: Coin[],
  albums: Album[] = buildAlbums()
): WantGroup[] {
  const wanted = new Set(entries.map(e => wantKey(e.albumId, e.slotId)));
  const groups: WantGroup[] = [];
  for (const base of albums) {
    if (!entries.some(e => e.albumId === base.id)) continue;
    // A want may be a design slot or a P/D slot; look in both layouts.
    const views = base.mintVariants ? [base, albumInView(base, 'mint')] : [base];
    const items: WantItem[] = [];
    for (const album of views) {
      const fills = computeAlbumFills(album, coins);
      for (const section of album.sections) {
        for (const slot of section.slots) {
          if (!wanted.has(wantKey(base.id, slot.id)) || fills.has(slot.id)) continue;
          // Mint-view sublabels are just the mark, which the title already shows.
          const note = slot.designId ? slot.sublabel?.replace(/^[A-Z]+( · )?/, '') || null : slot.sublabel ?? null;
          items.push({ albumId: base.id, slot, title: itemTitle(slot), note, year: slotYear(slot) });
        }
      }
    }
    if (items.length) groups.push({ album: base, items });
  }
  return groups;
}

/** The list as plain text, for the share sheet or a message. */
export function wantListText(groups: WantGroup[]): string {
  const lines = ['My coin want list (Coin Odyssey)', ''];
  for (const group of groups) {
    lines.push(group.album.title);
    for (const item of group.items) lines.push(`  • ${item.title}${item.note ? ` (${item.note})` : ''}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function wantCount(groups: WantGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}
