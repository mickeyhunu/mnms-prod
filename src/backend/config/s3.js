/**
 * 파일 역할: AWS S3 클라이언트 초기화 및 버킷 존재 보장 유틸을 제공하는 설정 파일.
 */
const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

const awsRegion = String(process.env.AWS_REGION || 'ap-northeast-2').trim();
const s3BucketName = String(process.env.S3_BUCKET_NAME || '').trim();
const s3PublicBaseUrl = String(process.env.S3_PUBLIC_BASE_URL || '').trim();
const s3AutoCreateBucket = String(process.env.S3_AUTO_CREATE_BUCKET || 'false').toLowerCase() === 'true';

let s3Client = null;

function isS3UploadEnabled() {
  return Boolean(s3BucketName);
}

function getS3Client() {
  if (s3Client) return s3Client;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS 인증 환경변수(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)가 설정되지 않았습니다.');
  }

  s3Client = new S3Client({ region: awsRegion });
  return s3Client;
}

async function ensureS3BucketExists() {
  if (!isS3UploadEnabled()) return { enabled: false };

  const client = getS3Client();

  try {
    await client.send(new HeadBucketCommand({ Bucket: s3BucketName }));
    return { enabled: true, created: false, bucketName: s3BucketName };
  } catch (error) {
    const statusCode = Number(error?.$metadata?.httpStatusCode || 0);
    const isNotFoundLikeError = statusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchBucket';

    if (!isNotFoundLikeError) {
      throw new Error(`S3 버킷 상태 확인 실패: ${error.message}`);
    }

    if (!s3AutoCreateBucket) {
      throw new Error('S3 버킷이 존재하지 않습니다. S3_AUTO_CREATE_BUCKET=true 설정 후 재시도하거나, 버킷을 수동 생성해주세요.');
    }

    const params = { Bucket: s3BucketName };
    if (awsRegion !== 'us-east-1') {
      params.CreateBucketConfiguration = { LocationConstraint: awsRegion };
    }
    await client.send(new CreateBucketCommand(params));
    return { enabled: true, created: true, bucketName: s3BucketName };
  }
}

function buildS3ObjectUrl(key) {
  if (s3PublicBaseUrl) {
    return `${s3PublicBaseUrl.replace(/\/$/, '')}/${String(key || '').replace(/^\//, '')}`;
  }
  return `https://${s3BucketName}.s3.${awsRegion}.amazonaws.com/${String(key || '').replace(/^\//, '')}`;
}

module.exports = {
  awsRegion,
  s3BucketName,
  s3AutoCreateBucket,
  isS3UploadEnabled,
  getS3Client,
  ensureS3BucketExists,
  buildS3ObjectUrl
};
