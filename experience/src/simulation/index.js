import { createSimulation } from './create-simulation.js';

export { cameraRelativeInput } from './world.js';
export { createSimulation } from './create-simulation.js';
// 旧页面继续使用相同的 Shijo 默认实例；新场景拥有各自独立的导航与状态。
export const { createState, setDestination, refreshProximity, stepSimulation, snapshot } = createSimulation();
