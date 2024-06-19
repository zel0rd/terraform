import {
  EC2Client,
  TerminateInstancesCommand,
  DeleteNatGatewayCommand,
  DeleteSubnetCommand,
  DetachInternetGatewayCommand,
  DeleteInternetGatewayCommand,
  DeleteRouteTableCommand,
  DeleteVpcCommand,
  DescribeNatGatewaysCommand,
  DescribeRouteTablesCommand,
  DisassociateRouteTableCommand,
  DescribeInternetGatewaysCommand,
  DeleteSecurityGroupCommand,
  DescribeSecurityGroupsCommand,
  ReleaseAddressCommand,
  DescribeInstancesCommand,
  DescribeNetworkInterfacesCommand,
  DeleteNetworkInterfaceCommand
} from "@aws-sdk/client-ec2";
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

const deleteEC2Instance = async (instanceId) => {
  if (!instanceId) {
    throw new Error("Instance ID is undefined");
  }
  try {
    const params = { InstanceIds: [instanceId] };
    await ec2Client.send(new TerminateInstancesCommand(params));
    console.log(`Terminated EC2 instance with ID: ${instanceId}`);
  } catch (err) {
    console.error("Error terminating instance", err);
    throw err;
  }
};
const deleteNatGateway = async (natGatewayId, allocationId) => {
  if (!natGatewayId) {
    throw new Error("NAT Gateway ID is undefined");
  }
  try {
    // First, delete the NAT Gateway
    await ec2Client.send(new DeleteNatGatewayCommand({ NatGatewayId: natGatewayId }));
    console.log(`Deleted NAT Gateway with ID: ${natGatewayId}`);

    // Wait until the NAT Gateway is fully deleted
    let natGatewayState = 'deleting';
    while (natGatewayState !== 'deleted') {
      console.log(`Waiting for NAT Gateway ${natGatewayId} to be deleted...`);
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for 15 seconds
      const describeNatGatewayData = await ec2Client.send(new DescribeNatGatewaysCommand({ NatGatewayIds: [natGatewayId] }));
      if (describeNatGatewayData.NatGateways.length > 0) {
        natGatewayState = describeNatGatewayData.NatGateways[0].State;
      } else {
        natGatewayState = 'deleted';
      }
    }
    console.log(`NAT Gateway ${natGatewayId} is deleted`);

    // Release the Elastic IP address
    if (allocationId) {
      try {
        await ec2Client.send(new ReleaseAddressCommand({ AllocationId: allocationId }));
        console.log(`Released Elastic IP with Allocation ID: ${allocationId}`);
      } catch (err) {
        if (err.Code === 'InvalidAllocationID.NotFound') {
          console.log(`Elastic IP with Allocation ID ${allocationId} not found, skipping release.`);
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error("Error deleting NAT Gateway", err);
    throw err;
  }
};

const deleteNetworkInterfaces = async (subnetId) => {
  try {
    const describeNetworkInterfacesParams = {
      Filters: [{ Name: 'subnet-id', Values: [subnetId] }]
    };
    const networkInterfacesData = await ec2Client.send(new DescribeNetworkInterfacesCommand(describeNetworkInterfacesParams));

    for (const networkInterface of networkInterfacesData.NetworkInterfaces) {
      await ec2Client.send(new DeleteNetworkInterfaceCommand({ NetworkInterfaceId: networkInterface.NetworkInterfaceId }));
      console.log(`Deleted Network Interface with ID: ${networkInterface.NetworkInterfaceId}`);
    }
  } catch (err) {
    console.error("Error deleting network interfaces", err);
    throw err;
  }
};

const deleteSubnet = async (subnetId) => {
  if (!subnetId) {
    throw new Error("Subnet ID is undefined");
  }
  try {
    const describeInstancesParams = {
      Filters: [{ Name: 'subnet-id', Values: [subnetId] }]
    };
    const instances = await ec2Client.send(new DescribeInstancesCommand(describeInstancesParams));

    for (const reservation of instances.Reservations) {
      for (const instance of reservation.Instances) {
        await deleteEC2Instance(instance.InstanceId);
      }
    }

    // Delete all network interfaces in the subnet
    await deleteNetworkInterfaces(subnetId);

    await ec2Client.send(new DeleteSubnetCommand({ SubnetId: subnetId }));
    console.log(`Deleted Subnet with ID: ${subnetId}`);
  } catch (err) {
    if (err.Code === 'InvalidSubnetID.NotFound') {
      console.log(`Subnet ${subnetId} not found, skipping deletion.`);
    } else {
      console.error("Error deleting subnet", err);
      throw err;
    }
  }
};

const deleteInternetGateway = async (vpcId, igwId) => {
  if (!vpcId || !igwId) {
    throw new Error("VPC ID or Internet Gateway ID is undefined");
  }
  try {
    const describeParams = { InternetGatewayIds: [igwId] };
    const igwData = await ec2Client.send(new DescribeInternetGatewaysCommand(describeParams));
    if (igwData.InternetGateways.length === 0) {
      console.log(`Internet Gateway ${igwId} not found, skipping deletion.`);
      return;
    }
    console.log(`Internet Gateway ${igwId} exists. Proceeding with deletion.`);

    await ec2Client.send(new DetachInternetGatewayCommand({ InternetGatewayId: igwId, VpcId: vpcId }));
    console.log(`Detached Internet Gateway ${igwId} from VPC ${vpcId}`);

    await ec2Client.send(new DeleteInternetGatewayCommand({ InternetGatewayId: igwId }));
    console.log(`Deleted Internet Gateway with ID: ${igwId}`);
  } catch (err) {
    if (err.Code === 'InvalidInternetGatewayID.NotFound') {
      console.log(`Internet Gateway ${igwId} not found, skipping deletion.`);
    } else {
      console.error("Error deleting internet gateway", err);
      throw err;
    }
  }
};
const disassociateRouteTables = async (routeTableId) => {
  try {
    const describeRouteTablesParams = { RouteTableIds: [routeTableId] };
    const describeRouteTablesData = await ec2Client.send(new DescribeRouteTablesCommand(describeRouteTablesParams));
    if (describeRouteTablesData.RouteTables.length === 0) {
      console.log(`Route Table ${routeTableId} not found, skipping disassociation.`);
      return;
    }
    const associations = describeRouteTablesData.RouteTables[0].Associations;
    for (const association of associations) {
      if (!association.Main) {
        const disassociateParams = { AssociationId: association.RouteTableAssociationId };
        await ec2Client.send(new DisassociateRouteTableCommand(disassociateParams));
        console.log(`Disassociated Route Table ${routeTableId} from Association ID: ${association.RouteTableAssociationId}`);
      }
    }
  } catch (err) {
    if (err.Code === 'InvalidRouteTableID.NotFound') {
      console.log(`Route Table ${routeTableId} not found, skipping disassociation.`);
    } else {
      console.error("Error disassociating route table", err);
      throw err;
    }
  }
};

const deleteRouteTable = async (routeTableId) => {
  if (!routeTableId) {
    throw new Error("Route Table ID is undefined");
  }
  try {
    await disassociateRouteTables(routeTableId);
    await ec2Client.send(new DeleteRouteTableCommand({ RouteTableId: routeTableId }));
    console.log(`Deleted Route Table with ID: ${routeTableId}`);
  } catch (err) {
    if (err.Code === 'InvalidRouteTableID.NotFound') {
      console.log(`Route Table ${routeTableId} not found, skipping deletion.`);
    } else {
      console.error("Error deleting route table", err);
      throw err;
    }
  }
};

const deleteSecurityGroups = async (vpcId) => {
  try {
    const describeParams = {
      Filters: [{ Name: "vpc-id", Values: [vpcId] }]
    };
    const data = await ec2Client.send(new DescribeSecurityGroupsCommand(describeParams));
    for (const sg of data.SecurityGroups) {
      if (sg.GroupName !== "default") {
        await ec2Client.send(new DeleteSecurityGroupCommand({ GroupId: sg.GroupId }));
        console.log(`Deleted Security Group with ID: ${sg.GroupId}`);
      }
    }
  } catch (err) {
    console.error("Error deleting security groups", err);
    throw err;
  }
};

const deleteVpc = async (vpcId) => {
  if (!vpcId) {
    throw new Error("VPC ID is undefined");
  }
  try {
    await deleteSecurityGroups(vpcId);
    await ec2Client.send(new DeleteVpcCommand({ VpcId: vpcId }));
    console.log(`Deleted VPC with ID: ${vpcId}`);
  } catch (err) {
    console.error("Error deleting VPC", err);
    throw err;
  }
};

const deleteVpcSetup = async (setupDetails) => {
  try {
    const { vpcId, subnets, igwId, natGatewayId, allocationId, routeTables, ec2Instances } = setupDetails;

    for (const instanceId of Object.values(ec2Instances)) {
      await deleteEC2Instance(instanceId);
    }

    await deleteNatGateway(natGatewayId, allocationId);

    await deleteInternetGateway(vpcId, igwId);

    for (const routeTableId of Object.values(routeTables)) {
      await deleteRouteTable(routeTableId);
    }

    for (const subnetId of subnets) {
      await deleteSubnet(subnetId);
    }

    await deleteVpc(vpcId);

    console.log('Deleted all resources successfully');
  } catch (err) {
    console.error("Error deleting VPC setup", err);
    throw err;
  }
};


export default deleteVpcSetup;
