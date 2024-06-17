import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createEc2Instance = async (subnetId, securityGroupId, name, ami, instanceType) => {
  const params = {
    ImageId: ami,
    InstanceType: instanceType,
    KeyName: process.env.KEY_NAME,
    MinCount: 1,
    MaxCount: 1,
    NetworkInterfaces: [
      {
        SubnetId: subnetId,
        DeviceIndex: 0,
        Groups: [securityGroupId]
      }
    ],
    TagSpecifications: [
      {
        ResourceType: "instance",
        Tags: [
          {
            Key: "Name",
            Value: name
          }
        ]
      }
    ]
  };
  const instanceData = await ec2Client.send(new RunInstancesCommand(params));
  return instanceData.Instances[0].InstanceId;
};
