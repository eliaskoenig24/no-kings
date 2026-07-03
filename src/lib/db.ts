import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { TwinProfile, TwinValues } from '@/types';

export interface Identity {
  id: 1;
  privkey: string;
  pubkey: string;
  createdAt: string;
}

export interface TwinSnapshot {
  id: string;
  twinId: string;
  savedAt: string;
  values: TwinValues;
  label?: string;
}

export interface TwinDemographics {
  id: 1;
  country: string;
  region?: string;
  city?: string;
  ageGroup?: '18-24' | '25-34' | '35-49' | '50-64' | '65+';
  urbanity?: 'rural' | 'town' | 'city' | 'metro';
  employment?: 'employed' | 'self' | 'unemployed' | 'student' | 'retired';
  savedAt: string;
}

class NoKingsDB extends Dexie {
  twins!: EntityTable<TwinProfile, 'id'>;
  identity!: EntityTable<Identity, 'id'>;
  twin_history!: EntityTable<TwinSnapshot, 'id'>;
  demographics!: EntityTable<TwinDemographics, 'id'>;

  constructor() {
    super('no-kings-db');
    this.version(1).stores({
      twins: 'id, createdAt, updatedAt',
    });
    this.version(2).stores({
      twins: 'id, createdAt, updatedAt',
      identity: 'id',
    });
    this.version(3).stores({
      twins: 'id, createdAt, updatedAt',
      identity: 'id',
      twin_history: 'id, twinId, savedAt',
    });
    this.version(4).stores({
      twins: 'id, createdAt, updatedAt',
      identity: 'id',
      twin_history: 'id, twinId, savedAt',
      demographics: 'id',
    });
  }
}

export const db = new NoKingsDB();

export async function saveMyTwin(twin: TwinProfile): Promise<void> {
  await db.twins.put({ ...twin, id: 'my-twin' });
  await db.twin_history.add({
    id: uuidv4(),
    twinId: twin.id,
    savedAt: new Date().toISOString(),
    values: {
      klimaschutz: twin.klimaschutz,
      sozialstaat: twin.sozialstaat,
      wirtschaft: twin.wirtschaft,
      bildung: twin.bildung,
      gesundheit: twin.gesundheit,
      migration: twin.migration,
      freiheit: twin.freiheit,
      europa: twin.europa,
    },
    label: undefined,
  });
}

export async function saveTwinSnapshot(twin: TwinProfile): Promise<void> {
  await db.twin_history.add({
    id: uuidv4(),
    twinId: twin.id,
    savedAt: new Date().toISOString(),
    values: {
      klimaschutz: twin.klimaschutz,
      sozialstaat: twin.sozialstaat,
      wirtschaft: twin.wirtschaft,
      bildung: twin.bildung,
      gesundheit: twin.gesundheit,
      migration: twin.migration,
      freiheit: twin.freiheit,
      europa: twin.europa,
    },
    label: undefined,
  });
}

export async function getTwinHistory(): Promise<TwinSnapshot[]> {
  return db.twin_history.orderBy('savedAt').reverse().toArray();
}

export async function clearTwinHistory(): Promise<void> {
  await db.twin_history.clear();
}

export async function getMyTwin(): Promise<TwinProfile | undefined> {
  const all = await db.twins.orderBy('createdAt').reverse().limit(1).toArray();
  return all[0];
}

export async function clearMyTwin(): Promise<void> {
  await db.twins.clear();
}

export async function getIdentity(): Promise<Identity | undefined> {
  return db.identity.get(1);
}

export async function saveIdentity(identity: Identity): Promise<void> {
  await db.identity.put(identity);
}

export async function saveDemographics(d: Omit<TwinDemographics, 'id' | 'savedAt'>): Promise<void> {
  await db.demographics.put({ ...d, id: 1, savedAt: new Date().toISOString() });
}

export async function getDemographics(): Promise<TwinDemographics | undefined> {
  return db.demographics.get(1);
}
