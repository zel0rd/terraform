import { EC2Client, AllocateAddressCommand, CreateNatGatewayCommand, DescribeNatGatewaysCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createNatGateway = async (subnetId) => {
  const eipData = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
  const eipAllocationId = eipData.AllocationId;

  const natGatewayData = await ec2Client.send(new CreateNatGatewayCommand({ SubnetId: subnetId, AllocationId: eipAllocationId }));
  const natGatewayId = natGatewayData.NatGateway.NatGatewayId;

  let natGatewayState = 'pending';
  while (natGatewayState !== 'available') {
    console.log(`Waiting for NAT Gateway ${natGatewayId} to become available...`);
    await new Promise(resolve => setTimeout(resolve, 15000));
    const describeNatGatewayData = await ec2Client.send(new DescribeNatGatewaysCommand({ NatGatewayIds: [natGatewayId] }));
    natGatewayState = describeNatGatewayData.NatGateways[0].State;
  }

  return natGatewayId;
};
