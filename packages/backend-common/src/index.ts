// === @workspace/backend-common ===
// Shared backend utilities consumed by domain packages.

export { eventBus } from './eventBus';
export { logAction, type AuditContext } from './audit';
export {
  triggerAutomation,
  registerAutomationProvider,
  type AutomationEvent,
} from './automation';
export { emitSocket, registerSocketProvider } from './socket';
