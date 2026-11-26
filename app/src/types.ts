export interface Size { k: 'about' | 'upto' | 'ormore' | 'past' | 'range'; a: number; b?: number; m?: 'wingspan' | 'shell' }
export interface SizeBasis { k: 'paper' | 'museum' | 'popular' | 'relatives'; ref?: string; url?: string; text: string }
export interface CastMember {
  name: string; sil?: string; emoji: string; zone: 'air' | 'bank' | 'edge' | 'sand' | 'water';
  len: number; sz: Size; size: string; basis?: SizeBasis; note: string;
  look?: { text: string; refs?: string[] };
  painted?: { outline: PaintedAnimal | null; free: PaintedAnimal | null };
}
import type { Check } from './Checked';
export interface PaintedAnimal { f: string; w: number; h: number; approach: 'outline' | 'free'; model: string; prompt: string; iou?: number; check?: Check }
export interface Silhouette { f: string; w: number; h: number; by: string; lic: string; licUrl: string; of: string; level: 'own' | 'member' | 'relative'; img: string }
export interface Paper { key: string; doi: string; title: string; journal: string; year: number; authors: string[] }
export interface Spot { id: string; x: number; y: number; r: number; cast?: string[]; title?: string; from?: 'setting' | 'rock' | 'plants' | 'know'; text?: string }
export type Status = 'documented' | 'inferred' | 'imagined';
export interface Decision { id: string; says: string; status: Status; why?: string; refs?: string[]; alternatives?: string; spots?: string[]; cast?: string; together?: string }
export interface Brief { id: string; title: string; current_as_of: string; summary: string;
  layers: Record<'place' | 'landscape' | 'life' | 'moment' | 'discovery', Decision[]>; refs: Record<string, { a: string; y: number; t: string; j: string; d: string }> }
export interface Site {
  id: string; name: string; where: string; at: [number, number]; t: number; when: string; blurb: string; setting: string; rock: string; plants: string;
  cast: CastMember[]; paint: { land: string; water: string; plants: string; light: string; not: string };
  know: string; debate: string; sil: Record<string, Silhouette>; papers: Paper[];
  ground: { f: string; model: string; made: string; prompt: string; strips: string[]; check?: Check } | null;
  earth: { method: string; check?: Check } | null;
  painting: { f: string; w: number; h: number; model: string; prompt: string; differs: string; check?: Check } | null;
  spots?: Spot[];
  brief: Brief | null;
  paintingHi: { dir: string; n: number } | null;
  plantSprites: { f: string; cells: { w: number; h: number }[] } | null;
}
