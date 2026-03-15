import { bouncingBallScene } from '../physics/scenes/bouncingBallScene';
import { cableStaticsScene } from '../physics/scenes/cableStaticsScene';
import { freeFallScene } from '../physics/scenes/freeFallScene';
import { inclineScene } from '../physics/scenes/inclineScene';
import { mcuScene } from '../physics/scenes/mcuScene';
import { mruScene } from '../physics/scenes/mruScene';
import { mruvScene } from '../physics/scenes/mruvScene';
import { packageDropScene } from '../physics/scenes/packageDropScene';
import { pulleyScene } from '../physics/scenes/pulleyScene';
import { riverCrossingScene } from '../physics/scenes/riverCrossingScene';
import { springScene } from '../physics/scenes/springScene';
import { trainCollisionScene } from '../physics/scenes/trainCollisionScene';
import { tractionScene } from '../physics/scenes/tractionScene';
import { vectorLabScene } from '../physics/scenes/vectorLabScene';
import { wallBracketScene } from '../physics/scenes/wallBracketScene';

export const scenes = [
  vectorLabScene,
  mruScene,
  mruvScene,
  mcuScene,
  freeFallScene,
  bouncingBallScene,
  packageDropScene,
  tractionScene,
  inclineScene,
  trainCollisionScene,
  riverCrossingScene,
  cableStaticsScene,
  wallBracketScene,
  springScene,
  pulleyScene,
];
