const Menu= require('../../models/menuModel');
const User= require('../../models/userModel');

exports.viewHome= async (req, res) => {
    const number = await User.countDocuments();
    res.status(200).render('home', {
        cnt: number
    });
}

exports.viewMenu= async (req, res) => {
    try{
        // Get all menu items but handle potential image issues
        const menusArray = await Menu.find();
        if(!menusArray){ throw new Error("Can't find menus from database!"); }

        // Ensure default image exists for any menu items with missing images
        const fs = require('fs');
        const path = require('path');
        const defaultImageExists = fs.existsSync(path.join(process.cwd(), 'public', 'img', 'foodPic', 'default.jpg'));
        
        // If default image doesn't exist, create a simple one
        if (!defaultImageExists) {
            try {
                const sharp = require('sharp');
                const foodPicDir = path.join(process.cwd(), 'public', 'img', 'foodPic');
                const menuDir = path.join(process.cwd(), 'public', 'img', 'menu');
                
                if (!fs.existsSync(foodPicDir)) {
                    fs.mkdirSync(foodPicDir, { recursive: true });
                }
                
                if (!fs.existsSync(menuDir)) {
                    fs.mkdirSync(menuDir, { recursive: true });
                }
                
                // Create a simple default image
                await sharp({
                    create: {
                        width: 500,
                        height: 500,
                        channels: 4,
                        background: { r: 220, g: 220, b: 220, alpha: 1 }
                    }
                })
                .jpeg()
                .toFile(path.join(foodPicDir, 'default.jpg'));
                
                // Copy to menu directory
                fs.copyFileSync(
                    path.join(foodPicDir, 'default.jpg'),
                    path.join(menuDir, 'default.jpg')
                );
            } catch (err) {
                console.error('Error creating default image:', err);
            }
        }

        res.status(200).render('menu', {
            pizzas: menusArray
        });
    } catch(err) {
        res.status(404).render('error', {
            message: err.message
        });
    }
}

exports.viewMe= async (req, res) => {
    try{
        res.status(200).render('customers/userAccount');
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view my account page :("
        });
    }
}

exports.viewUpdateInfo= async (req, res) => {
    try{
        res.status(200).render('updateInfo');
    } catch(err) {
        res.status(404).render('error', {
            message: "Can't view update info page :("
        });
    }
}

exports.viewUpdatePassword= async (req, res) => {
    try{
        res.status(200).render('updatePassword');
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view update password page :("
        });
    }
}

exports.viewError= async (req, res) => {
    res.status(404).render('error', {
        message: ''
    });
}
