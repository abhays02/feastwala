// support-module-integration.js
const SupportModule = require('./support-module/live-support-whatsapp-module');
const path = require('path');
const express = require('express');

/**
 * Integrates the WhatsApp ordering module with the main application
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options for the WhatsApp module
 * @returns {Object} - The configured Express app with WhatsApp module attached
 */
function integrateSupportModule(app, options = {}) {
  // Default configuration
  const defaultOptions = {
    whatsappNumber: '+91 9711386982', // Replace with your WhatsApp business number
    whatsappMessage: 'Hello! I would like to place an order from Feastwala:',
    enableWhatsapp: true,
    mountPath: '/support'
  };

  // Merge default options with user-provided options
  const moduleOptions = { ...defaultOptions, ...options };
  
  // Initialize the support module
  const supportModule = new SupportModule(moduleOptions);
  
  // Serve static assets directly
  app.use(`${moduleOptions.mountPath}/support-assets`, express.static(path.join(__dirname, 'support-module/public')));
  
  // Attach the module to the Express app
  supportModule.attach(app, moduleOptions.mountPath);
  
  console.log(`WhatsApp Order Module integrated successfully at ${moduleOptions.mountPath}`);
  
  return app;
}

module.exports = integrateSupportModule;