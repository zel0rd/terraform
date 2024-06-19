import { EC2Client, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand } from "@aws-sdk/client-ec2";
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

export const createOpenVpnSecurityGroup = async (vpcId) => {
  try {
    const sgParams = {
      Description: "OpenVPN Access Server-2.13.1-AutogenByAWSMP--1 created 2024-06-12T08:34:51.073Z",
      GroupName: "OpenVPN Access Server-2.13.1-AutogenByAWSMP--1",
      VpcId: vpcId,
    };
    const sgData = await ec2Client.send(new CreateSecurityGroupCommand(sgParams));
    const securityGroupId = sgData.GroupId;
    console.log(`Created Security Group with ID: ${securityGroupId}`);

    const ingressParams = {
      GroupId: securityGroupId,
      IpPermissions: [
        {
          IpProtocol: "tcp",
          FromPort: 22,
          ToPort: 22,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },
        {
          IpProtocol: "tcp",
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },
        {
          IpProtocol: "tcp",
          FromPort: 943,
          ToPort: 943,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },
        {
          IpProtocol: "tcp",
          FromPort: 945,
          ToPort: 945,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },
        {
          IpProtocol: "udp",
          FromPort: 1194,
          ToPort: 1194,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },
      ],
    };
    await ec2Client.send(new AuthorizeSecurityGroupIngressCommand(ingressParams));
    console.log("Inbound rules set for Security Group");

    return securityGroupId;
  } catch (err) {
    console.error("Error creating security group", err);
    throw err;
  }
};

export const createPrivateSecurityGroup = async (vpcId) => {
  try {
    const sgParams = {
      Description: "Security group for private EC2 instance",
      GroupName: "PrivateEC2SecurityGroup",
      VpcId: vpcId,
    };
    const sgData = await ec2Client.send(new CreateSecurityGroupCommand(sgParams));
    const securityGroupId = sgData.GroupId;
    console.log(`Created Security Group with ID: ${securityGroupId}`);

    const ingressParams = {
      GroupId: securityGroupId,
      IpPermissions: [
        {
          IpProtocol: "tcp",
          FromPort: 22,
          ToPort: 22,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        },

        {
          IpProtocol: "tcp",
          FromPort: 443,
          ToPort: 443,
          IpRanges: [{ CidrIp: "0.0.0.0/0" }],
        }
      ],
    };
    await ec2Client.send(new AuthorizeSecurityGroupIngressCommand(ingressParams));
    console.log("Inbound rules set for Security Group");

    return securityGroupId;
  } catch (err) {
    console.error("Error creating security group", err);
    throw err;
  }
};
