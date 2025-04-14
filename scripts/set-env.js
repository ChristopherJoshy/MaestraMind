const fs = require('fs');
const path = require('path');

const envFilePath = path.resolve(__dirname, '../.env');
const envFileContent = fs.readFileSync(envFilePath, 'utf8');

const envVars = envFileContent
  .split('\n')
  .filter(line => line.trim() !== '' && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});

console.log('Environment variables loaded:');
Object.keys(envVars).forEach(key => {
  process.env[key] = envVars[key];
  console.log(`- ${key}: ${key.includes('KEY') ? '****' : envVars[key]}`);
});

console.log('\nYou can now run your development server with:');
console.log('npm start');