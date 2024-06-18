import { EC2Client, AllocateAddressCommand, CreateNatGatewayCommand, DescribeNatGatewaysCommand } from "@aws-sdk/client-ec2";
import dotenv from "dotenv";

dotenv.config();

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const createNatGateway = async (subnetId) => {
  try {
    // Allocate Elastic IP for NAT Gateway
    const eipData = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
    const allocationId = eipData.AllocationId;
    console.log(`Allocated Elastic IP with Allocation ID: ${allocationId}`);

    // Create NAT Gateway in the specified Subnet
    const natGatewayParams = { SubnetId: subnetId, AllocationId: allocationId };
    const natGatewayData = await ec2Client.send(new CreateNatGatewayCommand(natGatewayParams));
    const natGatewayId = natGatewayData.NatGateway.NatGatewayId;
    console.log(`Created NAT Gateway with ID: ${natGatewayId}`);

    // Wait for NAT Gateway to become available
    let natGatewayState = 'pending';
    while (natGatewayState !== 'available') {
      console.log(`Waiting for NAT Gateway ${natGatewayId} to become available...`);
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds
      const describeNatGatewayData = await ec2Client.send(new DescribeNatGatewaysCommand({ NatGatewayIds: [natGatewayId] }));
      natGatewayState = describeNatGatewayData.NatGateways[0].State;
    }
    console.log(`NAT Gateway ${natGatewayId} is available`);

    return { natGatewayId, allocationId };
  } catch (err) {
    console.error("Error creating NAT Gateway", err);
    throw err;
  }
};
