import { EC2Client, CreateInternetGatewayCommand, AttachInternetGatewayCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createInternetGateway = async (vpcId) => {
  const igwData = await ec2Client.send(new CreateInternetGatewayCommand({}));
  const igwId = igwData.InternetGateway.InternetGatewayId;

  await ec2Client.send(new AttachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));

  return igwId;
};
