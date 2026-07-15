const mediaProcessor = require('../media.processor');
const { prisma } = require('@workspace/db');
const { processMediaVideo } = require('../../../utils/reelWorker');
const { getIo } = require('../../../sockets/index');
const Sentry = require('../../../config/sentry');
const { deleteFromR2 } = require('../../../utils/r2');

jest.mock('@workspace/db', () => ({
  prisma: {
    reel: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    story: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    forumPost: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/reelWorker.js', () => ({
  processMediaVideo: jest.fn(),
}));

jest.mock('../../../sockets/index.js', () => ({
  getIo: jest.fn(),
}));

jest.mock('../../../config/sentry', () => ({
  captureException: jest.fn(),
}));

jest.mock('../../../utils/r2.js', () => ({
  deleteFromR2: jest.fn(),
}));

describe('Media Processor', () => {
  let mockJob;
  let mockIo;
  let mockSocketTo;
  let mockSocketEmit;

  beforeEach(() => {
    mockJob = {
      id: 'job-123',
      attemptsMade: 1,
      data: {
        mediaId: 'media-1',
        mediaType: 'reel',
      },
    };

    mockSocketEmit = jest.fn();
    mockSocketTo = jest.fn().mockReturnValue({ emit: mockSocketEmit });
    mockIo = { to: mockSocketTo };
    getIo.mockReturnValue(mockIo);
  });

  it('should successfully process a reel and clean up R2', async () => {
    const mockMedia = {
      id: 'media-1',
      userId: 'user-1',
      rawVideoUrl: 'https://pub.r2.dev/temp/reels/video.mp4',
    };

    prisma.reel.findUnique.mockResolvedValue(mockMedia);
    prisma.reel.update.mockResolvedValue(true);
    
    processMediaVideo.mockResolvedValue({
      hlsUrl: 'https://cdn/hls/master.m3u8',
      thumbnailUrl: 'https://cdn/thumb.jpg',
    });

    deleteFromR2.mockResolvedValue(true);

    const result = await mediaProcessor(mockJob);

    expect(prisma.reel.findUnique).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    
    // First update: status processing
    expect(prisma.reel.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'media-1' },
      data: { status: 'PROCESSING' },
    });

    expect(processMediaVideo).toHaveBeenCalledWith(mockMedia, 'reel', undefined);

    // Second update: status published
    expect(prisma.reel.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'media-1' },
      data: {
        status: 'PUBLISHED',
        hlsUrl: 'https://cdn/hls/master.m3u8',
        thumbnailUrl: 'https://cdn/thumb.jpg',
        rawVideoUrl: null,
      },
    });

    // Verify R2 cleanup
    expect(deleteFromR2).toHaveBeenCalled();

    // Verify socket emission
    expect(mockSocketTo).toHaveBeenCalledWith('user:user-1');
    expect(mockSocketEmit).toHaveBeenCalledWith('MEDIA_PROCESSING_COMPLETE', {
      mediaId: 'media-1',
      mediaType: 'reel',
      hlsUrl: 'https://cdn/hls/master.m3u8',
      thumbnailUrl: 'https://cdn/thumb.jpg',
    });

    expect(result).toBeDefined();
  });

  it('should throw error for invalid media type', async () => {
    mockJob.data.mediaType = 'invalid_type';

    await expect(mediaProcessor(mockJob)).rejects.toThrow('Invalid media type');
  });

  it('should handle transcode failure, mark as failed in DB, and capture Sentry exception', async () => {
    const mockMedia = { id: 'media-1', userId: 'user-1' };
    prisma.reel.findUnique.mockResolvedValue(mockMedia);
    
    const processingError = new Error('FFmpeg crash');
    processMediaVideo.mockRejectedValue(processingError);

    await expect(mediaProcessor(mockJob)).rejects.toThrow('FFmpeg crash');

    expect(Sentry.captureException).toHaveBeenCalledWith(processingError, expect.any(Object));

    // Ensure status is marked as failed
    expect(prisma.reel.update).toHaveBeenCalledWith({
      where: { id: 'media-1' },
      data: { status: 'FAILED' },
    });

    // Verify R2 cleanup is NOT called on failure
    expect(deleteFromR2).not.toHaveBeenCalled();
  });

  it('should not crash if R2 cleanup fails', async () => {
    const mockMedia = {
      id: 'media-1',
      rawVideoUrl: 'https://pub.r2.dev/temp/reels/video.mp4',
    };
    prisma.reel.findUnique.mockResolvedValue(mockMedia);
    processMediaVideo.mockResolvedValue({});
    
    // Simulate cleanup failure
    deleteFromR2.mockRejectedValue(new Error('S3 error'));

    // Should still resolve successfully
    await expect(mediaProcessor(mockJob)).resolves.toBeDefined();
    
    // Verify DB was still updated to PUBLISHED
    expect(prisma.reel.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ status: 'PUBLISHED' }),
    }));
  });
});
