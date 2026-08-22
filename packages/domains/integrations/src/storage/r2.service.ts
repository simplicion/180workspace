import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT || '',
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || '',
    },
});

export const uploadBufferToR2 = async (buffer: Buffer, key: string, mimetype: string) => {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('R2 Bucket name is not configured');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
    });

    await s3Client.send(command);

    // Assuming public access is configured via custom domain or R2 dev url
    const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.REELS_CDN_URL;
    const publicUrl = publicUrlBase 
        ? `${publicUrlBase}/${key}`
        : `https://${bucketName}.r2.dev/${key}`;

    return {
        url: publicUrl,
        key: key
    };
};

export const getPresignedUploadUrl = async (key: string, mimetype: string) => {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('R2 Bucket name is not configured');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: mimetype,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
};
