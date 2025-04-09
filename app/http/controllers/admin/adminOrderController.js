const Order= require('../../../models/orderModel');
const Menu= require('../../../models/menuModel');
const User= require('../../../models/userModel');
const PaymentDetail= require('../../../models/paymentDetailModel');
const moment= require('moment'); // This JS library is used to format date and time nicely
const emailLib= require('../../../../email');

exports.fetchAdminOrder= async (req, res) => {
    // This can access user info from req.user
    // This can access session info from req.session
    // Order address and phoneNumber are in req.body

    try{
        // let query= Order.find({ customerID: req.user._id });
        
        let query = Order.find({
            status: {
              $nin: ['completed', 'cancelled', 'refunded', 'reject-refund']
            }
        });// mereko saare active order chahiye. I am admin 💕day
        query= query.populate({
            path: 'customerID',
            select: '-__v -passwordChangedAt'
        });
        query= query.sort('-createdAt');
        const orders= await query;

        console.log(orders);

        res.status(200).render('admin/adminOrder', {
             orders: orders ,
             moment: moment // we are sending whole library to front-end 😂 (in order to format dates)
        });

    } catch (err) {
        res.status(404).render('error', {
            message: "Can't show active orders :("
        });
    }
}

exports.statusUpdateAdminOrder= async (req, res) => {
    try{

        const orderId= req.body.orderId;
        const status= req.body.status;

        await Order.findOneAndUpdate({_id: orderId}, {status: status}, {
            new: true,
            runValidators: true
        });

        // Emiting node-event after updating status (for socket io) to change singleOrder page in real time
        const eventEmitter= req.app.get('eventEmitterKey');
        eventEmitter.emit('statusUpdate', { orderID: orderId, status: status }); 
        // we can listen to this event on server with name 'statusUpdate' and follwing data (2nd Arg)

        res.status(200).redirect('/admin-order');
        
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view order status update page :("
        });
    }
}


exports.viewAddFood= async (req, res) => {
    try{
        res.status(200).render('admin/addFood');
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view add food form :("
        });
    }
}


const filterObj = (obj, ...allowedFields) =>{ // 'obj' is req.body, and 'allowedField' is array of name of field which are supposed to be updated
    const newObj = {};
    Object.keys(obj).forEach( function(el){
        if(allowedFields.includes(el) === true) {
            newObj[el]= obj[el];
        }
    });

    return newObj;
}


exports.addFoodBackend= async (req, res) => {
    try{

        const filterField= filterObj(req.body, 'name', 'foodType', 'halfFull', 'isVeg', 'price', 'description');
        let newFoodItem;

        if(req.file) { // if there is any field name 'req.file'. Then it means user wants to upload picture
            filterField.image= req.file.filename; // add a new field named 'photo'
            // 'req.file.filename' store the name (that we have specified in 'multerStorage') of uploaded photo
            
            // Copy the image to the menu directory as well to ensure it's accessible from both paths
            const fs = require('fs');
            const path = require('path');
            const sourcePath = path.join(process.cwd(), 'public', 'img', 'foodPic', req.file.filename);
            const destPath = path.join(process.cwd(), 'public', 'img', 'menu', req.file.filename);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
            }

            newFoodItem= await Menu.create({ 
                name: filterField.name,
                foodType: filterField.foodType,
                isVeg: filterField.isVeg,
                halfFull: filterField.halfFull,
                price: filterField.price,
                description: filterField.description,
                image: filterField.image
            });
        }
        else{
            newFoodItem= await Menu.create({ 
                name: filterField.name,
                foodType: filterField.foodType,
                isVeg: filterField.isVeg,
                halfFull: filterField.halfFull,
                price: filterField.price,
                description: filterField.description
            });
        }

        // Notify all user's about our new menu item
        const allUser= await User.find({});
        allUser.forEach(async (user)=>{
            if(user.role === 'user'){
                const url= `${req.protocol}://${req.get('host')}/menu`;
                await new emailLib(user, url).newFoodItem();
            }
        })

        res.status(200).json({
            status: 'Success',
            data: newFoodItem
        })
    } catch (err) {
        res.status(404).json({
            status: "fail",
            message: err.message
        });
    }
}

exports.fetchIssuedForRefund= async (req, res) => {
    // This can access user info from req.user
    // This can access session info from req.session
    // Order address and phoneNumber are in req.body

    try{
        // let query= Order.find({ customerID: req.user._id });
        console.log("here");
        let refundRequired= Order.find( { status: 'cancelled' ,  paymentType: 'online' } ); 
        refundRequired= refundRequired.populate({
            path: 'customerID',
            select: '-__v -passwordChangedAt'
        });
        refundRequired= refundRequired.sort('-createdAt');
        const RefundRequiredOrder= await refundRequired;


        let refunded= Order.find( { status: 'refunded' ,  paymentType: 'online' } ); 
        refunded= refunded.populate({
            path: 'customerID',
            select: '-__v -passwordChangedAt'
        });
        refunded= refunded.sort('-createdAt');
        const RefundedOrder= await refunded;

        let rejectRefund= Order.find( { status: 'reject-refund' ,  paymentType: 'online' } ); 
        rejectRefund= rejectRefund.populate({
            path: 'customerID',
            select: '-__v -passwordChangedAt'
        });
        rejectRefund= rejectRefund.sort('-createdAt');
        const RejectRefundedOrder= await rejectRefund;

        res.status(200).render('admin/refundStatus', {
            RefundRequiredOrder: RefundRequiredOrder ,
            RefundedOrder: RefundedOrder,
            RejectRefundedOrder: RejectRefundedOrder,
            moment: moment // we are sending whole library to front-end 😂 (in order to format dates)
        });

    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view refund detail page :("
        });
    }
}

exports.refundStatusUpdate= async (req, res) => {
    try{

        const orderId= req.body.orderId;
        const status= req.body.status;
        if(status !== ""){
            await Order.findOneAndUpdate({_id: orderId}, {status: status}, {
                new: true,
                runValidators: true
            });

            if(status === "refunded"){
                const updatedPaymentDetail= await PaymentDetail.findOneAndUpdate({productOrderID: orderId}, {status: "refunded"}, {
                    new: true,
                    runValidators: true
                });
                // Refund mail will be sent to user.
                const user= await User.findOne({_id: updatedPaymentDetail.customerID});
                let price= updatedPaymentDetail.amount/100;
                price= price.toString(10);

                await new emailLib(user, price).sendRefundMail();
            }
        }        

        res.status(200).redirect('/admin-order-refund-status');
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view refund status page :("
        });
    }
}

// Menu Management Functions
exports.manageMenu = async (req, res) => {
    try {
        const menuItems = await Menu.find().sort('foodType');
        
        res.status(200).render('admin/manageMenu', {
            menuItems: menuItems
        });
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view menu management page :("
        });
    }
}

exports.getEditFood = async (req, res) => {
    try {
        const menuItem = await Menu.findById(req.params.id);
        
        if (!menuItem) {
            return res.status(404).render('error', {
                message: "Menu item not found"
            });
        }
        
        res.status(200).render('admin/editFood', {
            menuItem: menuItem
        });
    } catch (err) {
        res.status(404).render('error', {
            message: "Can't view edit food form :("
        });
    }
}

exports.updateFood = async (req, res) => {
    try {
        const filterField = filterObj(req.body, 'name', 'foodType', 'halfFull', 'isVeg', 'price', 'description');
        
        // Convert checkbox values to boolean
        if (filterField.halfFull) {
            filterField.halfFull = filterField.halfFull === 'on' ? true : false;
        }
        
        if (filterField.isVeg) {
            filterField.isVeg = filterField.isVeg === 'on' ? true : false;
        }
        
        // Handle image update if new image is uploaded
        if (req.file) {
            filterField.image = req.file.filename;
            
            // Copy the image to the menu directory as well to ensure it's accessible from both paths
            const fs = require('fs');
            const path = require('path');
            const sourcePath = path.join(process.cwd(), 'public', 'img', 'foodPic', req.file.filename);
            const destPath = path.join(process.cwd(), 'public', 'img', 'menu', req.file.filename);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
        
        const updatedMenuItem = await Menu.findByIdAndUpdate(
            req.params.id,
            filterField,
            {
                new: true,
                runValidators: true
            }
        );
        
        if (!updatedMenuItem) {
            return res.status(404).render('error', {
                message: "Menu item not found"
            });
        }
        
        res.status(200).redirect('/admin-manage-menu');
    } catch (err) {
        console.error(err);
        res.status(404).render('error', {
            message: "Failed to update menu item :("
        });
    }
}

exports.deleteFood = async (req, res) => {
    try {
        const menuItem = await Menu.findByIdAndDelete(req.params.id);
        
        if (!menuItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Menu item not found'
            });
        }
        
        res.status(200).json({
            status: 'success',
            message: 'Menu item deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete menu item'
        });
    }
}