const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'My Node App',
  description: 'My Node.js application running as a Windows service.',
  script: 'C:\Users\Lloyd\Documents\Shopify\sample2\src\App.js'  // Use the full path to your Node.js script
});

// Listen for the "install" event, which indicates the service is available.
svc.on('install', () => {
  svc.start();
  console.log('Service installed and started successfully.');
});

svc.install();
