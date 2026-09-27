import { Request, Response } from 'express';
import { MediaService } from './media.service';

export class MediaController {
  /**
   * POST /api/v1/pitch/media/upload-url
   * Generates a pre-signed URL for client to directly upload video file to R2
   */
  static async requestUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: login required to request upload URL' });
        return;
      }

      const { filename, contentType } = req.body;
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }

      const uploadMeta = await MediaService.generateUploadUrl({
        filename,
        contentType: contentType || 'video/mp4',
        userId,
      });

      res.json({
        success: true,
        ...uploadMeta,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate upload URL' });
    }
  }

  /**
   * POST /api/v1/pitch/media/process-video
   * Dispatches the uploaded video to BullMQ ABR transcoding worker
   */
  static async processVideo(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { pitchId, rawVideoUrl } = req.body;
      if (!pitchId || !rawVideoUrl) {
        res.status(400).json({ error: 'pitchId and rawVideoUrl are required' });
        return;
      }

      const result = await MediaService.enqueueTranscodeJob(pitchId, rawVideoUrl, userId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to enqueue transcoding job' });
    }
  }
}
