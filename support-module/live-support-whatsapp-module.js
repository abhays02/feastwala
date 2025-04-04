// live-support-whatsapp-module.js

const express = require('express');
const router = express.Router();
const path = require('path');
const bodyParser = require('body-parser');

class SupportModule {
  constructor(options = {}) {
    this.router = router;
    this.options = {
      whatsappNumber: options.whatsappNumber || '+919711386982',
      whatsappMessage: options.whatsappMessage || 'I would like to place an order',
      enableWhatsapp: options.enableWhatsapp !== undefined ? options.enableWhatsapp : true
    };
    
    this.setupRoutes();
  }
  
  setupRoutes() {
    // Parse JSON bodies
    this.router.use(bodyParser.json());
    
    // Serve static assets for the module
    this.router.use('/support-assets', express.static(path.join(__dirname, 'public')));
    
    // API route for WhatsApp orders
    this.router.post('/api/whatsapp/generate-link', (req, res) => {
      const { products, customerName } = req.body;
      
      // Generate product list text
      const productList = products.map(p => `${p.quantity}x ${p.name} (${p.price})`).join('\n');
      
      // Create WhatsApp message
      const message = encodeURIComponent(
        `${this.options.whatsappMessage}\n\nCustomer: ${customerName}\n\nOrder:\n${productList}`
      );
      
      // Generate WhatsApp link
      const whatsappLink = `https://wa.me/${this.options.whatsappNumber}?text=${message}`;
      
      res.json({ success: true, whatsappLink });
    });
  }
  
  // Method to inject the UI components into your web pages
  injectUI(mountPath) {
    return (req, res, next) => {
      // Store the original send function
      const originalSend = res.send;
      
      // Override the send function
      res.send = function(body) {
        // Only modify HTML responses
        if (typeof body === 'string' && res.get('Content-Type') && 
            res.get('Content-Type').includes('text/html')) {
          
          // Inject our CSS and scripts before the closing body tag
          const scriptTags = `
            <link rel="stylesheet" href="${mountPath}/support-assets/support-module.css">
            
            ${this.options.enableWhatsapp ? `
            <div id="whatsapp-order" class="whatsapp-button">
              <a href="https://wa.me/${this.options.whatsappNumber}?text=${encodeURIComponent(this.options.whatsappMessage)}" target="_blank">
                <img src="${mountPath}/support-assets/whatsapp-icon.png" alt="WhatsApp">
                <span>Order via WhatsApp</span>
              </a>
            </div>
            ` : ''}
            
            <script src="${mountPath}/support-assets/support-module.js"></script>
            <script>
              // Initialize the support module
              document.addEventListener('DOMContentLoaded', function() {
                initSupportModule({
                  whatsappNumber: '${this.options.whatsappNumber}',
                  enableWhatsapp: ${this.options.enableWhatsapp}
                });
              });
            </script>
          `;
          
          // Insert scripts before closing body tag
          body = body.replace('</body>', scriptTags + '</body>');
        }
        
        // Call the original send function
        return originalSend.call(this, body);
      };
      
      next();
    };
  }
  
  // Method to attach the module to your Express app
  attach(app, mountPath = '/support') {
    // Mount the router
    app.use(mountPath, this.router);
    
    // Add middleware to inject UI
    app.use(mountPath, this.injectUI(mountPath));
    
    console.log(`WhatsApp Order Module mounted at ${mountPath}`);
    
    return app;
  }
}

module.exports = SupportModule;