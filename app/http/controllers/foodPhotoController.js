const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create directories and default image on module load
const initializeImageDirectories = () => {
    try {
        // Define paths
        const foodPicDir = path.join(process.cwd(), 'public', 'img', 'foodPic');
        const menuDir = path.join(process.cwd(), 'public', 'img', 'menu');
        
        // Create directories if they don't exist
        if (!fs.existsSync(foodPicDir)) {
            fs.mkdirSync(foodPicDir, { recursive: true });
        }
        
        if (!fs.existsSync(menuDir)) {
            fs.mkdirSync(menuDir, { recursive: true });
        }
        
        // Create default image if it doesn't exist
        const defaultPath = path.join(foodPicDir, 'default.jpg');
        const menuDefaultPath = path.join(menuDir, 'default.jpg');
        
        if (!fs.existsSync(defaultPath)) {
            // Create a simple colored square as default image
            sharp({
                create: {
                    width: 500,
                    height: 500,
                    channels: 4,
                    background: { r: 220, g: 220, b: 220, alpha: 1 }
                }
            })
            .jpeg()
            .toFile(defaultPath)
            .then(() => {
                // Copy to menu directory
                if (fs.existsSync(defaultPath)) {
                    fs.copyFileSync(defaultPath, menuDefaultPath);
                }
            })
            .catch(err => {
                console.error('Error creating default image:', err);
            });
        }
    } catch (err) {
        console.error('Error initializing image directories:', err);
    }
};

// Run initialization
initializeImageDirectories();

// Configure multer storage
const multerStorage = multer.memoryStorage();

// Configure multer filter
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

// Configure multer upload
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadPhoto = upload.single('foodPhoto');

exports.foodPhotoProcessing = async (req, res, next) => {
    // If no file was uploaded, continue
    if (!req.file) {
        return next();
    }
    
    try {
        // Generate filename
        req.file.filename = `food-${Date.now()}.jpeg`;
        
        // Define paths
        const foodPicDir = path.join(process.cwd(), 'public', 'img', 'foodPic');
        const menuDir = path.join(process.cwd(), 'public', 'img', 'menu');
        const outputPath = path.join(foodPicDir, req.file.filename);
        const menuOutputPath = path.join(menuDir, req.file.filename);
        
        // Ensure buffer is valid
        if (!req.file.buffer || req.file.buffer.length === 0) {
            console.error('Invalid image buffer');
            req.file.filename = 'default.jpg';
            return next();
        }
        
        // Process image with robust error handling
        try {
            // Use failOnError option to handle corrupt images
            await sharp(req.file.buffer, { failOnError: false })
                .resize(500, 500)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(outputPath);
            
            // Only copy if the file was created successfully
            if (fs.existsSync(outputPath)) {
                fs.copyFileSync(outputPath, menuOutputPath);
            } else {
                throw new Error('Image processing failed to create output file');
            }
        } catch (processError) {
            console.error('Image processing specific error:', processError);
            req.file.filename = 'default.jpg';
        }
        
        next();
    } catch (err) {
        console.error('Image processing error:', err);
        req.file.filename = 'default.jpg';
        next();
    }
};