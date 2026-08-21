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
export { EmailService } from './email.service';
export * as queueService from './queue.service';
export * as pdfUtils from './pdf.utils';
