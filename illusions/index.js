import geometric from './geometric.js';
import ambiguous from './ambiguous.js';
import motion from './motion.js';
import light from './light.js';

export const ILLUSIONS = [...geometric, ...ambiguous, ...motion, ...light];
export const CATEGORIES = [...new Set(ILLUSIONS.map(i => i.cat))];
export const byId = id => ILLUSIONS.find(i => i.id === id);
