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


// Load environment variables from .env file
require('dotenv').config();

const AWS = require('aws-sdk');

// Configure AWS SDK with environment variables
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create an EC2 service object
const ec2 = new AWS.EC2();

// Parameters for the instance
const instanceParams = {
  ImageId: 'ami-0c55b159cbfafe1f0', // Replace with a valid AMI ID for your region
  InstanceType: 't2.micro',
  KeyName: 'your-key-pair-name', // Replace with the name of your key pair
  MinCount: 1,
  MaxCount: 1,
  TagSpecifications: [
    {
      ResourceType: 'instance',
      Tags: [
        {
          Key: 'Name',
          Value: 'MyFirstInstance'
        }
      ]
    }
  ]
};

// Create the instance
ec2.runInstances(instanceParams, (err, data) => {
  if (err) {
    console.error("Could not create instance", err);
    return;
  }

  const instanceId = data.Instances[0].InstanceId;
  console.log("Created instance", instanceId);

  // Add tags to the instance
  const tagParams = {
    Resources: [instanceId],
    Tags: [
      {
        Key: 'Name',
        Value: 'MyFirstInstance'
      }
    ]
  };

  ec2.createTags(tagParams, (err) => {
    if (err) {
      console.error("Could not tag instance", err);
      return;
    }
    console.log("Successfully tagged instance");
  });
});
