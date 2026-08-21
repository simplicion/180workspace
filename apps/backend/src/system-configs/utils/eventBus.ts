import { EventEmitter } from 'events';

class GlobalEventBus extends EventEmitter {}

const eventBus = new GlobalEventBus();

export default eventBus;
