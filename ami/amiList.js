// amiList.js
import { EC2Client, DescribeImagesCommand } from "@aws-sdk/client-ec2";
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

const getAMIList = async () => {
  try {
    const params = {
      Owners: ["self"] // Replace with appropriate owner, e.g., 'self' for AMIs owned by the account
    };
    const data = await ec2Client.send(new DescribeImagesCommand(params));
    const amiDetails = data.Images.map(image => ({
      imageId: image.ImageId,
      name: image.Name,
      description: image.Description,
      tags: image.Tags
    }));
    return JSON.stringify(amiDetails, null, 2); // JSON 포맷으로 변환
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default getAMIList;
