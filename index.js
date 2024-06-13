import createVpcSetup from './vpc/createVpcSetup.js';
import deleteVpcSetup from './vpc/deleteVpcSetup.js';
import { saveSetupDetails, loadSetupDetails } from './utils/fileUtils.js';

const run = async () => {
  try {
    // Uncomment the following lines to create resources and save the setup details
    const setupDetails = await createVpcSetup();
    saveSetupDetails(setupDetails);

    // const setupDetails = loadSetupDetails();
    // console.log(setupDetails)
    // await deleteVpcSetup(setupDetails);
  } catch (err) {
    console.log("Error", err);
  }
};

run();
