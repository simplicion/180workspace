import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Queue } from 'bullmq';
import { prisma } from '@workspace/db';

export interface PresignedUrlRequest {
  filename: string;
  contentType: string;
  userId: string;
}

export class MediaService {
  private static s3Client: S3Client | null = null;
  private static transcodeQueue: Queue | null = null;

  /**
   * Initialize or retrieve S3 / Cloudflare R2 Client.
   */
  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      const endpoint = process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'mock_access_key';
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'mock_secret_key';
      const region = process.env.R2_REGION || process.env.AWS_REGION || 'auto';

      this.s3Client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
    }
    return this.s3Client;
  }

  /**
   * Initialize or retrieve BullMQ video transcoding queue.
   */
  private static getQueue(): Queue | null {
    if (!this.transcodeQueue) {
      const redisUrl = process.env.REDIS_URL;
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

      try {
        const connection = redisUrl ? { url: redisUrl } : { host: redisHost, port: redisPort };
        this.transcodeQueue = new Queue('reel-transcode', {
          connection: connection as any,
        });
      } catch (err) {
        console.warn('[PitchMedia] Redis not configured, async BullMQ queue offline:', (err as any).message);
        this.transcodeQueue = null;
      }
    }
    return this.transcodeQueue;
  }

  /**
   * Generate pre-signed URL for direct client-to-R2 video upload.
   */
  static async generateUploadUrl(req: PresignedUrlRequest) {
    const bucket = process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '180-media';
    const publicBase = process.env.R2_PUBLIC_URL || `https://${bucket}.r2.cloudflarestorage.com`;

    // Sanitize extension and build unique key
    const parts = req.filename.split('.');
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : 'mp4';
    const uniqueKey = `pitches/${req.userId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const client = this.getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: uniqueKey,
      ContentType: req.contentType || 'video/mp4',
    });

    // 15-minute expiration window for client upload
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    const publicUrl = `${publicBase}/${uniqueKey}`;

    return {
      uploadUrl,
      key: uniqueKey,
      publicUrl,
      expiresIn: 900,
      headers: {
        'Content-Type': req.contentType || 'video/mp4',
      },
    };
  }

  /**
   * Enqueue video to BullMQ ABR HLS transcoding pipeline.
   */
  static async enqueueTranscodeJob(pitchId: string, rawVideoUrl: string, userId: string) {
    const queue = this.getQueue();

    // Mark post status as processing in DB
    await prisma.pitchinPost.update({
      where: { id: pitchId },
      data: { status: 'processing' },
    });

    if (queue) {
      const job = await queue.add(
        'transcode-pitch',
        {
          id: pitchId,
          rawVideoUrl,
          userId,
          mediaType: 'pitch_reel',
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        }
      );
      return { enqueued: true, jobId: job.id };
    }

    // Mock fallback when Redis is absent in local dev/test
    return { enqueued: false, reason: 'Redis queue offline. Post marked as processing.' };
  }
}
