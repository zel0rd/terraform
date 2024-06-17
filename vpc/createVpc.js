import { EC2Client, CreateVpcCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createVpc = async (cidr) => {
  const params = { CidrBlock: cidr };
  const vpcData = await ec2Client.send(new CreateVpcCommand(params));
  return vpcData.Vpc.VpcId;
};
