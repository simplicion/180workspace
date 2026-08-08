const EventEmitter = require('events');

class GlobalEventBus extends EventEmitter {}

const eventBus = new GlobalEventBus();

module.exports = eventBus;
