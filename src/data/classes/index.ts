import type { ClassDef } from '../../types';
import { createRegistry } from '../registry';
import { guardian } from './guardian';
import { hunter } from './hunter';
import { mage } from './mage';
import { warrior } from './warrior';

/** 職業の登録表。職業を増やすときはファイルを追加してここに並べるだけでよい */
export const CLASSES = createRegistry<ClassDef>('class', [warrior, mage, guardian, hunter]);

export const getClass = (id: string) => CLASSES.get(id);
