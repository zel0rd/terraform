// describeSecurityGroups.js
import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
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

const getSecurityGroups = async () => {
  try {
    const data = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    const securityGroups = data.SecurityGroups.map(group => ({
      groupId: group.GroupId,
      groupName: group.GroupName,
      description: group.Description,
      vpcId: group.VpcId,
      tags: group.Tags
    }));
    return securityGroups; // Return the list of security groups as an array of objects
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default getSecurityGroups;
