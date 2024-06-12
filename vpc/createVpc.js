// createVpc.js
import { EC2Client, CreateVpcCommand, CreateSubnetCommand, CreateInternetGatewayCommand, AttachInternetGatewayCommand, CreateRouteTableCommand, CreateRouteCommand, AssociateRouteTableCommand } from "@aws-sdk/client-ec2";
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

const createVpc = async () => {
  try {
    // Create VPC
    const vpcParams = {
      CidrBlock: "10.0.0.0/16"
    };
    const vpcData = await ec2Client.send(new CreateVpcCommand(vpcParams));
    const vpcId = vpcData.Vpc.VpcId;
    console.log(`Created VPC with ID: ${vpcId}`);

    // Create Subnet
    const subnetParams = {
      CidrBlock: "10.0.1.0/24",
      VpcId: vpcId
    };
    const subnetData = await ec2Client.send(new CreateSubnetCommand(subnetParams));
    const subnetId = subnetData.Subnet.SubnetId;
    console.log(`Created Subnet with ID: ${subnetId}`);

    // Create Internet Gateway
    const igwData = await ec2Client.send(new CreateInternetGatewayCommand({}));
    const igwId = igwData.InternetGateway.InternetGatewayId;
    console.log(`Created Internet Gateway with ID: ${igwId}`);

    // Attach Internet Gateway to VPC
    const attachIgwParams = {
      InternetGatewayId: igwId,
      VpcId: vpcId
    };
    await ec2Client.send(new AttachInternetGatewayCommand(attachIgwParams));
    console.log(`Attached Internet Gateway ${igwId} to VPC ${vpcId}`);

    // Create Route Table
    const rtParams = {
      VpcId: vpcId
    };
    const rtData = await ec2Client.send(new CreateRouteTableCommand(rtParams));
    const routeTableId = rtData.RouteTable.RouteTableId;
    console.log(`Created Route Table with ID: ${routeTableId}`);

    // Create Route to Internet Gateway
    const routeParams = {
      DestinationCidrBlock: "0.0.0.0/0",
      GatewayId: igwId,
      RouteTableId: routeTableId
    };
    await ec2Client.send(new CreateRouteCommand(routeParams));
    console.log(`Created Route to Internet Gateway ${igwId}`);

    // Associate Route Table with Subnet
    const associateRtParams = {
      RouteTableId: routeTableId,
      SubnetId: subnetId
    };
    await ec2Client.send(new AssociateRouteTableCommand(associateRtParams));
    console.log(`Associated Route Table ${routeTableId} with Subnet ${subnetId}`);

    return { vpcId, subnetId, igwId, routeTableId };
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default createVpc;
