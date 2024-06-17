import { EC2Client, CreateSubnetCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createSubnet = async (vpcId, cidr, az) => {
  const params = { VpcId: vpcId, CidrBlock: cidr, AvailabilityZone: az };
  const subnetData = await ec2Client.send(new CreateSubnetCommand(params));
  return subnetData.Subnet.SubnetId;
};
