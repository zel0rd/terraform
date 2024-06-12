import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = path.join(__dirname, 'setupDetails.json');

export const saveSetupDetails = (setupDetails) => {
  fs.writeFileSync(FILE_PATH, JSON.stringify(setupDetails, null, 2));
  console.log(`Setup details saved to ${FILE_PATH}`);
};

export const loadSetupDetails = () => {
  if (fs.existsSync(FILE_PATH)) {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
  } else {
    throw new Error('Setup details file not found');
  }
};
