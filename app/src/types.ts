export interface CastMember { name: string; sil?: string; emoji: string; zone: 'air' | 'bank' | 'edge' | 'sand' | 'water'; len: number | null; size: string; note: string }
export interface Silhouette { f: string; w: number; h: number; by: string; lic: string; licUrl: string; of: string; level: 'own' | 'member' | 'relative'; img: string }
export interface Paper { key: string; doi: string; title: string; journal: string; year: number; authors: string[] }
export interface Site {
  id: string; name: string; where: string; when: string; blurb: string; setting: string; rock: string; plants: string;
  cast: CastMember[]; paint: { land: string; water: string; plants: string; light: string; not: string };
  know: string; debate: string; sil: Record<string, Silhouette>; papers: Paper[];
}
