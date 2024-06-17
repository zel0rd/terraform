import { EC2Client, CreateRouteTableCommand, CreateRouteCommand, AssociateRouteTableCommand } from "@aws-sdk/client-ec2";

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const ec2Client = new EC2Client({ region: REGION });

export const createRouteTable = async (vpcId, targetId, subnetId, isNatGateway = false) => {
  const routeTableData = await ec2Client.send(new CreateRouteTableCommand({ VpcId: vpcId }));
  const routeTableId = routeTableData.RouteTable.RouteTableId;

  const routeParams = {
    DestinationCidrBlock: "0.0.0.0/0",
    RouteTableId: routeTableId,
  };

  if (isNatGateway) {
    routeParams.NatGatewayId = targetId;
  } else {
    routeParams.GatewayId = targetId;
  }

  await ec2Client.send(new CreateRouteCommand(routeParams));
  await ec2Client.send(new AssociateRouteTableCommand({ RouteTableId: routeTableId, SubnetId: subnetId }));

  return routeTableId;
};
