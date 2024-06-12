// ec2Instances.js
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Set the AWS Region
const REGION = process.env.AWS_REGION || "us-west-2"; // For example, "us-west-2"

// Create EC2 service object
const ec2Client = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getEC2Instances = async () => {
  try {
    const data = await ec2Client.send(new DescribeInstancesCommand({}));
    const instances = data.Reservations?.flatMap(reservation => reservation.Instances) || [];
    return instances.map(instance => {
      const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
      const instanceName = nameTag ? nameTag.Value : 'No Name Tag';

      return {
        instanceId: instance.InstanceId,
        imageId: instance.ImageId,
        instanceName,
        tags: instance.Tags
      };
    });
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default getEC2Instances;
