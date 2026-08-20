import { prisma } from '@workspace/db';
﻿export { AIAssistantService } from './ai-assistant/ai.service.js';
export { CalendarService } from './calendar/calendar.service.js';
export { DocumentService } from './documents/document.service.js';
const aiContentService = require('./ai-assistant/ai-content.service.js');
export { aiContentService };
