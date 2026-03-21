import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const DB_BACKUP_KEY = 'backup.sqlite';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
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

export async function restoreDbFromR2(dbPath: string): Promise<void> {
    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY) {
        console.log('S3 not configured, skipping DB restore');
        return;
    }

    try {
        const client = getS3Client();
        const response = await client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: DB_BACKUP_KEY,
        }));

        if (response.Body) {
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as AsyncIterable<Buffer>) {
                chunks.push(chunk);
            }
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(dbPath, Buffer.concat(chunks));
            console.log('DB restored from R2');
        }
    } catch (err: unknown) {
        const error = err as { name?: string };
        if (error.name === 'NoSuchKey') {
            console.log('No backup found in R2, starting fresh');
        } else {
            console.error('Failed to restore DB from R2:', err);
        }
    }
}

export async function backupDbToR2(dbPath: string): Promise<void> {
    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY) {
        return;
    }

    try {
        if (!fs.existsSync(dbPath)) {
            return;
        }

        const client = getS3Client();
        const fileBuffer = fs.readFileSync(dbPath);

        await client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: DB_BACKUP_KEY,
            Body: fileBuffer,
            ContentType: 'application/x-sqlite3',
        }));

        console.log('DB backed up to R2');
    } catch (err) {
        console.error('Failed to backup DB to R2:', err);
    }
}
