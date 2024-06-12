// createEC2Instance.js
import { EC2Client, RunInstancesCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
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

const createEC2Instance = async (amiId, sgId) => {
  try {
    const params = {
      ImageId: amiId,
      InstanceType: 't2.micro',
      MinCount: 1,
      MaxCount: 1,
      KeyName: process.env.KEY_NAME, // Replace with the name of your key pair
      SecurityGroupIds: [sgId], // Add your desired security group ID here
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            {
              Key: 'Name',
              Value: 'MyNewInstance'
            }
          ]
        }
      ]
    };

    const data = await ec2Client.send(new RunInstancesCommand(params));
    const instanceId = data.Instances[0].InstanceId;
    console.log(`Created instance with ID: ${instanceId}`);

    // Optionally, describe the instance to get more details
    const describeParams = {
      InstanceIds: [instanceId]
    };
    const instanceData = await ec2Client.send(new DescribeInstancesCommand(describeParams));
    return instanceData.Reservations[0].Instances[0];
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default createEC2Instance;
