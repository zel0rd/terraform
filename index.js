const AWS = require('aws-sdk');

// AWS 설정
AWS.config.update({
  accessKeyId: 'AKIAVCVL3GBEJIO5FNOF',
  secretAccessKey: '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',
  region: 'ap-northeast-2' // 예: us-west-2
});

// 예시: S3 서비스 사용
const s3 = new AWS.S3();

// S3에서 버킷 목록 가져오기
s3.listBuckets((err, data) => {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Bucket List", data.Buckets);
  }
});
