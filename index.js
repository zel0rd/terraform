import { createVpc } from './vpc/createVpc.js';
import { createSubnet } from './vpc/createSubnet.js';
import { createRouteTable } from './vpc/createRouteTable.js';
import { createInternetGateway } from './vpc/createInternetGateway.js';
import { createNatGateway } from './vpc/createNatGateway.js';
import { createEc2Instance } from './vpc/createEc2Instance.js';
import { createOpenVpnSecurityGroup, createPrivateSecurityGroup } from './sg/securityGroupSetup.js';
import { saveSetupDetails, loadSetupDetails, commentOutSetupDetails } from './utils/fileUtils.js';
import deleteVpcSetup from './vpc/deleteVpcSetup.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGION = process.env.AWS_REGION || "ap-northeast-2";

const run = async (envConfig) => {
  try {
    const { vpcCidr, subnets, instances, openVpn } = envConfig;

    const vpcId = await createVpc(vpcCidr);

    const subnetIds = await Promise.all(subnets.map(subnet => createSubnet(vpcId, subnet.cidr, `${REGION}${subnet.availabilityZone}`)));

    const igwId = await createInternetGateway(vpcId);
    const natGatewayId = await createNatGateway(subnetIds[0]);

    const routeTableIds = await Promise.all(subnetIds.map((subnetId, index) => {
      const targetId = index === 0 ? igwId : natGatewayId;
      const isNatGateway = index !== 0;
      return createRouteTable(vpcId, targetId, subnetId, isNatGateway);
    }));

    const openVpnSecurityGroupId = await createOpenVpnSecurityGroup(vpcId);
    const openVpnId = await createEc2Instance(subnetIds[openVpn.subnetIndex], openVpnSecurityGroupId, openVpn.name, openVpn.ami, openVpn.type);

    const privateSecurityGroupId = await createPrivateSecurityGroup(vpcId);
    const ec2InstanceIds = await Promise.all(instances.map(instance => {
      return createEc2Instance(subnetIds[instance.subnetIndex], privateSecurityGroupId, instance.name, instance.ami, instance.type);
    }));

    const setupDetails = {
      vpcId,
      subnets: subnetIds,
      igwId,
      natGatewayId,
      routeTables: routeTableIds,
      ec2Instances: { openVpnId, ...ec2InstanceIds }
    };

    saveSetupDetails(setupDetails);
    console.log('Setup completed successfully:', setupDetails);

  } catch (err) {
    console.log("Error", err);
  }
};

const deleteSetup = async () => {
  try {
    const setupDetails = loadSetupDetails();
    await deleteVpcSetup(setupDetails);
    commentOutSetupDetails();
  } catch (err) {
    console.error("Error deleting setup", err);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const action = args[0];
  const envFile = args[1];

  if (!action || !['create', 'delete'].includes(action)) {
    console.error("Please provide an action ('create' or 'delete') and an environment file.");
    process.exit(1);
  }

  if (action === 'create' && !envFile) {
    console.error("Please provide an environment file for creation.");
    process.exit(1);
  }

  if (action === 'create') {
    const envConfigPath = path.resolve(__dirname, 'config', envFile);
    if (!fs.existsSync(envConfigPath)) {
      console.error("Environment file not found:", envConfigPath);
      process.exit(1);
    }
    const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
    await run(envConfig);
  } else if (action === 'delete') {
    await deleteSetup();
  }
};

main();



//  node index.js create environment1.json
//  node index.js delete