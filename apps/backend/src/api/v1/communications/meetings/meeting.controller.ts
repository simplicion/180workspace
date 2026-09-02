import { Request, Response, NextFunction } from 'express';
import { MeetingService } from '@workspace/communications';
import { GoogleSheetsService } from '@workspace/integrations';
const googleSheetsService = new GoogleSheetsService();

export const createMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const meeting = await MeetingService.createMeeting((req as any).user, req.body);
        res.status(201).json({ meeting });
    } catch (err) {
  next(err);
}
};

export const listRecentMeetings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const meetings = await MeetingService.listRecentMeetings((req as any).user);
        res.json({ meetings });
    } catch (err) {
  next(err);
}
};

export const validateRoomAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.validateRoomAccess((req as any).user, req.params.roomId);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const logJoin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.logJoin((req as any).user, req.body);
        res.json(result);
    } catch (err) {
  next(err);
}
};

export const logLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.logLeave((req as any).user, req.body);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};

export const processTranscript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.processTranscript((req as any).user, AIService, googleSheetsService, req.body);
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('too short') || err.message.includes('parse AI output')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message.includes('Company settings')) {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.getSummary((req as any).user, googleSheetsService, req.params.roomId);
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Access denied')) {
            return res.status(403).json({ error: err.message });
        }
        next(err);
    }
};

export const saveTranscript = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.saveTranscript((req as any).user, req.body);
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getTranscripts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.getTranscripts((req as any).user, req.params.meetingLogId);
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const chatWithMeetingAI = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.chatWithMeetingAI((req as any).user, AIService, req.body);
        res.json(result);
    } catch (err: any) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        next(err);
    }
};

export const getLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const log = await MeetingService.getLog((req as any).user, req.params.meetingLogId);
        res.json({ log });
    } catch (err: any) {
  next(err);
}
};

export const getRoomDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const log = await MeetingService.getRoomDetails((req as any).user, req.params.roomId);
        res.json({ log });
    } catch (err: any) {
  next(err);
}
};

export const deleteMeeting = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await MeetingService.deleteMeeting((req as any).user, req.params.roomId);
        res.json(result);
    } catch (err: any) {
  next(err);
}
};
