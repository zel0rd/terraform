import { EC2Client, CreateVpcCommand, CreateSubnetCommand, CreateInternetGatewayCommand, AttachInternetGatewayCommand, CreateRouteTableCommand, CreateRouteCommand, AssociateRouteTableCommand, AllocateAddressCommand, CreateNatGatewayCommand, DescribeNatGatewaysCommand, RunInstancesCommand, CreateTagsCommand } from "@aws-sdk/client-ec2";
import dotenv from "dotenv";
import { createOpenVpnSecurityGroup, createPrivateSecurityGroup } from '../sg/securityGroupSetup.js';

dotenv.config();

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const createVpcSetup = async () => {
  try {
    // Create VPC
    const vpcParams = { CidrBlock: "10.1.0.0/16" };
    const vpcData = await ec2Client.send(new CreateVpcCommand(vpcParams));
    const vpcId = vpcData.Vpc.VpcId;
    console.log(`Created VPC with ID: ${vpcId}`);

    // Tag VPC with a name
    const tagParams = {
      Resources: [vpcId],
      Tags: [
        {
          Key: "Name",
          Value: "my-test-vpc"
        }
      ]
    };
    await ec2Client.send(new CreateTagsCommand(tagParams));
    console.log(`Tagged VPC with Name: my-test-vpc`);

    // Create Public Subnet A
    const publicSubnetAParams = { CidrBlock: "10.1.1.0/26", VpcId: vpcId, AvailabilityZone: `${REGION}a` };
    const publicSubnetAData = await ec2Client.send(new CreateSubnetCommand(publicSubnetAParams));
    const publicSubnetAId = publicSubnetAData.Subnet.SubnetId;
    console.log(`Created Public Subnet A with ID: ${publicSubnetAId}`);

    // Create Private Subnet App A
    const privateSubnetAppAParams = { CidrBlock: "10.1.1.128/27", VpcId: vpcId, AvailabilityZone: `${REGION}a` };
    const privateSubnetAppAData = await ec2Client.send(new CreateSubnetCommand(privateSubnetAppAParams));
    const privateSubnetAppAId = privateSubnetAppAData.Subnet.SubnetId;
    console.log(`Created Private Subnet App A with ID: ${privateSubnetAppAId}`);

    // Create Private Subnet DB A
    const privateSubnetDbAParams = { CidrBlock: "10.1.1.192/27", VpcId: vpcId, AvailabilityZone: `${REGION}a` };
    const privateSubnetDbAData = await ec2Client.send(new CreateSubnetCommand(privateSubnetDbAParams));
    const privateSubnetDbAId = privateSubnetDbAData.Subnet.SubnetId;
    console.log(`Created Private Subnet DB A with ID: ${privateSubnetDbAId}`);

    // Create Internet Gateway
    const igwData = await ec2Client.send(new CreateInternetGatewayCommand({}));
    const igwId = igwData.InternetGateway.InternetGatewayId;
    console.log(`Created Internet Gateway with ID: ${igwId}`);

    // Attach Internet Gateway to VPC
    await ec2Client.send(new AttachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));
    console.log(`Attached Internet Gateway ${igwId} to VPC ${vpcId}`);

    // Allocate Elastic IP for NAT Gateway
    const eipData = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
    const eipAllocationId = eipData.AllocationId;
    console.log(`Allocated Elastic IP with Allocation ID: ${eipAllocationId}`);

    // Create NAT Gateway in Public Subnet A
    const natGatewayParams = { SubnetId: publicSubnetAId, AllocationId: eipAllocationId };
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

    // Create Route Table for Public Subnet A
    const publicRouteTableParams = { VpcId: vpcId };
    const publicRouteTableData = await ec2Client.send(new CreateRouteTableCommand(publicRouteTableParams));
    const publicRouteTableId = publicRouteTableData.RouteTable.RouteTableId;
    console.log(`Created Public Route Table with ID: ${publicRouteTableId}`);

    // Create Route to Internet Gateway in Public Route Table
    await ec2Client.send(new CreateRouteCommand({ DestinationCidrBlock: "0.0.0.0/0", GatewayId: igwId, RouteTableId: publicRouteTableId }));
    console.log(`Created Route to Internet Gateway ${igwId}`);

    // Associate Public Route Table with Public Subnet A
    await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: publicRouteTableId, SubnetId: publicSubnetAId }));
    console.log(`Associated Public Route Table ${publicRouteTableId} with Public Subnet ${publicSubnetAId}`);

    // Create Route Table for Private Subnets
    const privateRouteTableParams = { VpcId: vpcId };
    const privateRouteTableData = await ec2Client.send(new CreateRouteTableCommand(privateRouteTableParams));
    const privateRouteTableId = privateRouteTableData.RouteTable.RouteTableId;
    console.log(`Created Private Route Table with ID: ${privateRouteTableId}`);

    // Create Route to NAT Gateway in Private Route Table
    await ec2Client.send(new CreateRouteCommand({ DestinationCidrBlock: "0.0.0.0/0", NatGatewayId: natGatewayId, RouteTableId: privateRouteTableId }));
    console.log(`Created Route to NAT Gateway ${natGatewayId}`);

    // Associate Private Route Table with Private Subnets
    await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: privateRouteTableId, SubnetId: privateSubnetAppAId }));
    await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: privateRouteTableId, SubnetId: privateSubnetDbAId }));
    console.log(`Associated Private Route Table ${privateRouteTableId} with Private Subnets`);

    // Create OpenVPN Security Group
    const openVpnSecurityGroupId = await createOpenVpnSecurityGroup(vpcId);

    // Create OpenVPN Instance in Public Subnet A
    const openVpnParams = {
      ImageId: process.env.AMI_IMAGE_OPENVPN, // Read AMI ID from .env file
      InstanceType: "t2.small",
      KeyName: process.env.KEY_NAME,
      MinCount: 1,
      MaxCount: 1,
      NetworkInterfaces: [
        {
          AssociatePublicIpAddress: true,
          SubnetId: publicSubnetAId,
          DeviceIndex: 0,
          Groups: [openVpnSecurityGroupId]
        }
      ],
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            {
              Key: "Name",
              Value: "OpenVPN"
            }
          ]
        }
      ]
    };
    const openVpnData = await ec2Client.send(new RunInstancesCommand(openVpnParams));
    const openVpnId = openVpnData.Instances[0].InstanceId;
    console.log(`Created OpenVPN Instance with ID: ${openVpnId}`);

    // Create Private EC2 Security Group
    const privateSecurityGroupId = await createPrivateSecurityGroup(vpcId);

    // Create Private EC2 Instance in Private Subnet App A
    const privateEC2Params = {
      ImageId: process.env.AMI_IMAGE_ID, // Read AMI ID from .env file
      InstanceType: "t2.micro",
      KeyName: process.env.KEY_NAME,
      MinCount: 1,
      MaxCount: 1,
      NetworkInterfaces: [
        {
          SubnetId: privateSubnetAppAId,
          DeviceIndex: 0,
          Groups: [privateSecurityGroupId]
        }
      ],
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            {
              Key: "Name",
              Value: "Private EC2"
            }
          ]
        }
      ]
    };
    const privateEC2Data = await ec2Client.send(new RunInstancesCommand(privateEC2Params));
    const privateEC2Id = privateEC2Data.Instances[0].InstanceId;
    console.log(`Created Private EC2 with ID: ${privateEC2Id}`);

    return {
      vpcId,
      publicSubnetAId,
      privateSubnetAppAId,
      privateSubnetDbAId,
      igwId,
      natGatewayId,
      publicRouteTableId,
      privateRouteTableId,
      openVpnId,
      privateEC2Id
    };
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
};

export default createVpcSetup;
