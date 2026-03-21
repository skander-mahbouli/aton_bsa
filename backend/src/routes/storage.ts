import { FastifyInstance } from 'fastify';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { requireAuth } from '../auth/middleware.js';

let s3Client: S3Client | null = null;

function getS3(): S3Client {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.S3_REGION || 'auto',
            endpoint: process.env.S3_ENDPOINT!,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY!,
                secretAccessKey: process.env.S3_SECRET_KEY!,
            },
        });
    }
    return s3Client;
}

export async function storageRoutes(app: FastifyInstance) {
    app.post<{
        Body: { videoFilename: string; videoContentType: string; thumbFilename: string };
    }>('/api/upload/presign', { preHandler: requireAuth }, async (request, reply) => {
        const { videoFilename, videoContentType, thumbFilename } = request.body || {};
        if (!videoFilename || !videoContentType || !thumbFilename) {
            return reply.status(400).send({ error: 'videoFilename, videoContentType, and thumbFilename are required' });
        }

        const uid = crypto.randomUUID();
        const videoExt = videoFilename.split('.').pop() || 'mp4';
        const thumbExt = thumbFilename.split('.').pop() || 'jpg';
        const videoKey = `videos/${uid}.${videoExt}`;
        const thumbKey = `thumbs/${uid}.${thumbExt}`;

        const client = getS3();

        const [videoUploadUrl, thumbUploadUrl] = await Promise.all([
            getSignedUrl(client, new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: videoKey,
                ContentType: videoContentType,
            }), { expiresIn: 600 }),
            getSignedUrl(client, new PutObjectCommand({
                Bucket: process.env.S3_BUCKET!,
                Key: thumbKey,
                ContentType: 'image/jpeg',
            }), { expiresIn: 600 }),
        ]);

        return { videoUploadUrl, videoKey, thumbUploadUrl, thumbKey };
    });
}
