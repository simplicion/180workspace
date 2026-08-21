import { Router } from 'express';
import * as ctrl from './meeting.controller';

const router = Router();

router.post('/', ctrl.createMeeting);
router.get('/', ctrl.listRecentMeetings);
router.get('/validate/:roomId', ctrl.validateRoomAccess);

router.post('/log/join', ctrl.logJoin);
router.post('/log/leave', ctrl.logLeave);

router.post('/ai/process', ctrl.processTranscript);
router.get('/ai/summary/:roomId', ctrl.getSummary);

router.post('/transcript', ctrl.saveTranscript);
router.get('/transcript/:meetingLogId', ctrl.getTranscripts);

router.post('/ai-chat', ctrl.chatWithMeetingAI);

router.get('/log/:meetingLogId', ctrl.getLog);
router.get('/room/:roomId/details', ctrl.getRoomDetails);

router.delete('/:roomId', ctrl.deleteMeeting);

export default router;
