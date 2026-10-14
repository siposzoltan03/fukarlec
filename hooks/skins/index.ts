import type { Skin } from '../bacsi'
import { csikos } from './csikos'
import { juhasz } from './juhasz'
import { kofa } from './kofa'
import { matyo } from './matyo'
import { paraszt } from './paraszt'

export const SKINS: readonly Skin[] = [paraszt, csikos, kofa, juhasz, matyo]

export const skinById = (id: string | undefined): Skin => SKINS.find(s => s.id === id) ?? paraszt
