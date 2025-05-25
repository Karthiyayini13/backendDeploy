

const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const productData = require('./productSchema');
const categoryData = require('./categorySchema');
const mediaTypeData = require('./mediaTypeSchema');
const prodOrderData = require ('./productOrderSchema');
const cors = require('cors')
const Razorpay = require('razorpay');//require razorpay then only we use
const bodyParser = require('body-parser');//sent the json data
const crypto = require('crypto');//inbuilt function to embed the data in this we use sha256 algorithm to safest way of payment
// Initialize the Express app
const app = express();
const PORT = 3001;

//Middlewares
app.use(cors());
app.use(bodyParser.json());




app.use("/images", express.static(path.join(__dirname, "../first-app/public/images")));

// MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/your-db-name");
mongoose.connect("mongodb+srv://karthiyayinitg1312:Rb8gF80kB2lD5bsM@cluster0.6vythax.mongodb.net/new?retryWrites=true&w=majority&appName=Cluster0");


// Image upload with multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../first-app/public/images'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// // Upload route
// app.post('/upload', upload.single('image'), (req, res) => {
//     const relativeImagePath = `/images/${filename}`;
//     res.json({ imageUrl: relativeImagePath });
// });


// Example backend upload route
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");

    const imageUrl = `/images/${req.file.filename}`; // relative path for static serving
    res.json({ imageUrl: imageUrl }); // OR use full URL: `http://localhost:3001/images/${req.file.filename}`
});





// //RAZORPAY configuration / setup
// const razorpay = new Razorpay( //new Razorpay - it is in built function to set up the razorpay method...inside we put the generated key and id
//     {
//         key_id: 'rzp_test_9SJbuhNnrdw3ra',
//         key_secret: 'ckOBXQLz2s7ZAqckvnJ1aUxd'
//     }
// )

// //create an order ...razorpay order

// app.post(
//     '/create-order', async (req, res) => {
//         const { amount, currency } = req.body; //this is in UI...what we type inside the type box amt and their currency type INR(indian rupees/anything)get that
//         try {
//             const options = { //we get the amount and currency type from frontend
//                 amount: amount * 100, // Amount in paise...because all the input value come under paise...we need to conver into whole amount
//                 currency, //currency code like INR
//                 receipt: `receipt_${Math.floor(Math.random() * 10000)}`, //receipt number create with random number and * 1000 limit... that will convert into whole number
//                 payment_capture: 1 //Auto capture the payment receipt / take a screen shot 1- true/ok to get the screen...0-false
//             }
//             const order = await razorpay.orders.create(options) //razorpay.orders.create - inbuilt function to create a razorpay order with we send the created payment options //that amount current,and one id generated sent to front end file..
//             res.status(200).json({
//                 order_id: order.id,
//                 currency: order.currency,
//                 amount: order.amount
//             });
//         }
//         catch (error) {
//             console.log("Error creating order", error);
//             res.status(500).send("Error creating order");
//         }
//     }

// )

// //verify the payment signature
// app.post(
//     '/verify-payment', (req, res) => {
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;//get all the inputs from UI...jsx file

//         const body = razorpay_order_id + "|" + razorpay_payment_id  //create a long textwithid type receipt by adding the order id and payment if
//         const expectedSignature = crypto.createHmac('sha256', 'ckOBXQLz2s7ZAqckvnJ1aUxd').update(body.toString()).digest('hex');//create a hash of the body using the secret key and we use SHA256 embedding algorithm for safe transaction
//         if (razorpay_signature === expectedSignature) { //if the signature is correct then it is payment is successful
//             res.status(200).json(
//                 { message: 'Payment Successful' }
//             )
//         }
//         else {
//             res.status(400).json({ message: 'Payment Failed' })
//         }
//     }
// )


//PRODUCTS    Other routes (get, post, put, delete)
app.get('/products', async (req, res) => {
    try {
        const data = await productData.find();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.get('/products/similar/:prodCode', async (req, res) => {
    try {
        // First find the current product
        const currentProduct = await productData.findOne({ prodCode: req.params.prodCode });
        if (!currentProduct || !currentProduct.similarProducts || currentProduct.similarProducts.length === 0) {
            return res.status(404).json({ message: "No similar products found" });
        }
        
        // Extract similar products' ProdCodes
        const prodCodes = currentProduct.similarProducts.map(p => p.ProdCode);
        
        // Fetch details of all similar products (excluding the current one)
        const similarProducts = await productData.find({ 
            prodCode: { $in: prodCodes },
            _id: { $ne: currentProduct._id } // Exclude current product by ID instead of prodCode
        });
        
        // Map the results to match the frontend expectation
        const mappedResults = similarProducts.map(product => ({
            _id: product._id,
            name: product.name,
            location: `${product.location.district}, ${product.location.state}`,
            dimensions: `${product.height} x ${product.width}`,
            price: product.price,
            rating: product.rating,
            image: product.image,
            category: product.mediaType,
            sizeHeight: product.height,
            sizeWidth: product.width,
            district: product.location.district,
            state: product.location.state,
            printingCost:product.printingCost,
            mountingCost:product.mountingCost,
            prodCode:product.prodCode,
            prodLighting:product.lighting,
            productFrom: product.from,
            productTo:product.to,
            productFixedAmount:product.fixedAmount,
            productFixedOffer:product.fixedOffer,
        
        }));
        
        res.json(mappedResults);
    } catch (err) {
        console.error("Error fetching similar products:", err);
        res.status(500).json({ message: "Error fetching similar products" });
    }
});

app.post('/products', async (req, res) => {
    try {
        const prodData = new productData(req.body);
        const saved = await prodData.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

app.put('/products/:id', async (req, res) => {
    try {
        // const id = req.params.id;
        const updated = await productData.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});
app.patch("/products/:id", async (req, res) => {
    const { id } = req.params;
    const { visible } = req.body;

    try {
        const updatedProduct = await productData.findByIdAndUpdate(
            id,
            { visible },
            { new: true }
        );

        res.json(updatedProduct);
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ message: "Failed to update visibility" });
    }
});

app.patch("/products/:id/remove-similar", async (req, res) => {
    const { id } = req.params;
    const { prodCode } = req.body;

    try {
        const updatedProduct = await productData.findByIdAndUpdate(
            id,
            { $pull: { similarProducts: { ProdCode: prodCode } } },
            { new: true }
        );

        res.json(updatedProduct);
    } catch (err) {
        console.error("Remove similar error:", err);
        res.status(500).json({ message: "Failed to remove similar product" });
    }
});



app.delete('/products/:id', async (req, res) => {
    try {
        const deleted = await productData.findByIdAndDelete(req.params.id);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});



// CATEGORY CRUD OPERATION
// GET 
app.get('/category', async (req, res) => {
    try {
        const categories = await categoryData.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//POST
app.post('/category', async (req, res) => {
    try {
        const newCategory = new categoryData(req.body);
        const saved = await newCategory.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//UPDATE
app.put('/category/:id', async (req, res) => {
    try {
        const updated = await categoryData.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//DELETE
app.delete('/category/:id', async (req, res) => {
    try {
        const deleted = await categoryData.findByIdAndDelete(req.params.id);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});



//MEDIA TYPE SECTION
// GET 
app.get('/mediatype', async (req, res) => {
    try {
        const mediaTypes = await mediaTypeData.find();
        res.json(mediaTypes);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//POST
app.post('/mediatype', async (req, res) => {
    try {
        const newMediaType = new mediaTypeData(req.body);
        const saved = await newMediaType.save();
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//UPDATE
app.put('/mediatype/:id', async (req, res) => {
    try {
        const updated = await mediaTypeData.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//DELETE
app.delete('/mediatype/:id', async (req, res) => {
    try {
        const deleted = await mediaTypeData.findByIdAndDelete(req.params.id);
        res.json(deleted);
    } catch (err) {
        res.status(500).json({ message: err });
    }
});

// //PRODUCT ORDER STORED SECTION
// // GET 
// app.get('/prodOrders', async (req, res) => {
//     try {
//         const orders = await prodOrderData.find();
//         res.json(orders);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });
// // GET single order
// app.get('/prodOrders/:id', async (req, res) => {
//     try {
//       const order = await prodOrderData.findById(req.params.id);
//       if (!order) {
//         return res.status(404).json({ message: 'Order not found' });
//       }
//       res.status(200).json(order);
//     } catch (err) {
//       res.status(500).json({ message: err.message });
//     }
//   });
// // Get all booked dates
// // app.get('/booked-dates', async (req, res) => {
// //     try {
// //       const orders = await prodOrderData.find({}, 'bookedDates');
// //       const allDates = orders.flatMap(order => 
// //         order.bookedDates.map(d => d.toISOString().split('T')[0])
// //       );
// //       res.json([...new Set(allDates)]); // Return unique dates
// //     } catch (err) {
// //       res.status(500).json({ message: err.message });
// //     }
// //   });

  

// // GET /booked-dates with exclusion
// app.get('/booked-dates', async (req, res) => {
//     try {
//         const excludeOrderId = req.query.excludeOrderId;
//         const query = excludeOrderId ? { _id: { $ne: excludeOrderId } } : {};
        
//         const orders = await prodOrderData.find(query, 'bookedDates');
//         const allDates = orders.flatMap(order => 
//             order.bookedDates.map(d => d.toISOString().split('T')[0])
//         );
//         res.json([...new Set(allDates)]);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });
  
// //   // Update order creation/update
// // //   function getDatesBetween(start, end) {
// // //     const dates = [];
// // //     const current = new Date(start);
// // //     const endDate = new Date(end);
    
// // //     while (current <= endDate) {
// // //       dates.push(new Date(current));
// // //       current.setDate(current.getDate() + 1);
// // //     }
// // //     return dates;
// // //   }


// // //POST
// // app.post('/prodOrders', async (req, res) => {
// //     try {
// //         const newOrders = new prodOrderData(req.body);
// //         const savedOrders = await newOrders.save();
// //         res.json(savedOrders);
// //     } catch (err) {
// //         res.status(500).json({ message: err.message });
// //     }
// // });
// // // Update the POST route to properly store booked dates
// // // Update the POST route to properly store booked dates



// // app.post('/prodOrders', async (req, res) => {
// //     try {
// //         const { booking } = req.body;
// //         if (!booking || !booking.startDate || !booking.endDate) {
// //             return res.status(400).json({ message: 'Start and end dates are required' });
// //         }

// //         // Parse and validate dates
// //         const startDate = new Date(booking.startDate);
// //         const endDate = new Date(booking.endDate);
        
// //         if (isNaN(startDate.getTime())) {
// //             return res.status(400).json({ message: 'Invalid start date' });
// //         }
// //         if (isNaN(endDate.getTime())) {
// //             return res.status(400).json({ message: 'Invalid end date' });
// //         }
// //         if (startDate > endDate) {
// //             return res.status(400).json({ message: 'End date must be after start date' });
// //         }

// //         // Normalize dates to UTC midnight
// //         startDate.setUTCHours(0, 0, 0, 0);
// //         endDate.setUTCHours(0, 0, 0, 0);

// //         // Generate all dates between start and end (inclusive)
// //         const bookedDates = [];
// //         const current = new Date(startDate);
// //         while (current <= endDate) {
// //             bookedDates.push(new Date(current));
// //             current.setDate(current.getDate() + 1);
// //         }

// //         // Check for existing bookings that conflict with these dates
// //         const existingBookings = await prodOrderData.find({
// //             'bookedDates': {
// //                 $in: bookedDates.map(date => date.toISOString())
// //             }
// //         });

// //         if (existingBookings.length > 0) {
// //             return res.status(400).json({ 
// //                 message: 'Some dates are already booked',
// //                 conflicts: existingBookings.map(b => b._id)
// //             });
// //         }

// //         // Create new order with UTC dates
// //         const newOrder = new prodOrderData({
// //             ...req.body,
// //             bookedDates: bookedDates
// //         });

// //         const savedOrder = await newOrder.save();
// //         res.status(201).json(savedOrder);
// //     } catch (err) {
// //         res.status(500).json({ message: err.message });
// //     }
// // });
  
// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const existingOrder = await prodOrderData.findById(orderId);
        
//         if (!existingOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Extract only needed fields from request body
//         const { booking } = req.body;
        
//         // Validate required fields
//         if (!booking?.startDate || !booking?.endDate) {
//             return res.status(400).json({ message: 'Start and end dates are required' });
//         }

//         // Date parsing and validation
//         const startDate = new Date(booking.startDate);
//         const endDate = new Date(booking.endDate);
        
//         if (startDate > endDate) {
//             return res.status(400).json({ message: 'End date must be after start date' });
//         }

//         // Generate booked dates array
//         const newBookedDates = [];
//         const current = new Date(startDate);
//         current.setUTCHours(0, 0, 0, 0);
//         endDate.setUTCHours(0, 0, 0, 0);

//         while (current <= endDate) {
//             newBookedDates.push(new Date(current));
//             current.setDate(current.getDate() + 1);
//         }

//         // Check conflicts with other orders
//         const conflictCheck = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             bookedDates: { $in: newBookedDates }
//         });

//         if (conflictCheck) {
//             return res.status(409).json({
//                 message: 'Selected dates conflict with existing bookings',
//                 conflicts: conflictCheck._id
//             });
//         }

//         // Update only the necessary fields
//         existingOrder.booking = {
//             ...existingOrder.booking.toObject(),
//             startDate: startDate.toISOString(),
//             endDate: endDate.toISOString(),
//             totalDays: booking.totalDays,
//             totalPrice: booking.totalPrice
//         };
        
//         existingOrder.bookedDates = newBookedDates;
        
//         const updatedOrder = await existingOrder.save();
//         res.status(200).json(updatedOrder);

//     } catch (err) {
//         console.error('Update error:', err);
//         res.status(500).json({ 
//             message: err.message || 'Server error during update' 
//         });
//     }
// });



// // //UPDATE
// // app.put('/prodOrders/:id', async (req, res) => {
// //     // try {
// //     //     const updatedOrder = await prodOrderData.findByIdAndUpdate(req.params.id, req.body, { new: true });
// //     //     res.json(updatedOrder);
// //     // } catch (err) {
// //     //     res.status(500).json({ message: err.message });
// //     // }
// //     try {
// //         const updatedOrder = await prodOrderData.findByIdAndUpdate(
// //           req.params.id,
// //           req.body,
// //           { new: true, runValidators: true }
// //         );
// //         if (!updatedOrder) {
// //           return res.status(404).json({ message: 'Order not found' });
// //         }
// //         res.status(200).json(updatedOrder);
// //       } catch (err) {
// //         res.status(400).json({ message: err.message });
// //       }
// // });




// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const existingOrder = await prodOrderData.findById(orderId);
        
//         if (!existingOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         const { booking } = req.body;
//         if (!booking || !booking.startDate || !booking.endDate) {
//             return res.status(400).json({ message: 'Start and end dates are required' });
//         }

//         // Parse and validate dates
//         const startDate = new Date(booking.startDate);
//         const endDate = new Date(booking.endDate);
        
//         if (isNaN(startDate.getTime())) {
//             return res.status(400).json({ message: 'Invalid start date' });
//         }
//         if (isNaN(endDate.getTime())) {
//             return res.status(400).json({ message: 'Invalid end date' });
//         }
//         if (startDate > endDate) {
//             return res.status(400).json({ message: 'End date must be after start date' });
//         }

//         // Normalize dates to UTC midnight
//         startDate.setUTCHours(0, 0, 0, 0);
//         endDate.setUTCHours(0, 0, 0, 0);

//         // Generate new booked dates range
//         const newBookedDates = [];
//         const current = new Date(startDate);
//         while (current <= endDate) {
//             newBookedDates.push(new Date(current));
//             current.setDate(current.getDate() + 1);
//         }

//         // Check for conflicts in other orders
//         const conflictingOrders = await prodOrderData.find({
//             _id: { $ne: orderId }, // Exclude current order from check
//             bookedDates: { 
//                 $in: newBookedDates.map(date => date.toISOString()) 
//             }
//         });

//         if (conflictingOrders.length > 0) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflicts: conflictingOrders.map(o => o._id)
//             });
//         }

//         // Update order with new dates and data
//         const updatedData = {
//             ...req.body,
//             bookedDates: newBookedDates
//         };

//         const updatedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             updatedData,
//             { new: true, runValidators: true }
//         );

//         res.status(200).json(updatedOrder);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });

// // const generateNextOrderId = async () => {
// //     try {
// //         // Find the order with the highest orderId
// //         const lastOrder = await prodOrderData.findOne().sort('-orderId');
        
// //         if (!lastOrder) {
// //             return 'AD0001'; // First order
// //         }
        
// //         // Extract the numeric part and increment
// //         const lastNumber = parseInt(lastOrder.orderId.substring(2));
// //         const nextNumber = lastNumber + 1;
        
// //         // Format with leading zeros
// //         return `AD${nextNumber.toString().padStart(4, '0')}`;
// //     } catch (err) {
// //         console.error("Error generating order ID:", err);
// //         // Fallback - generate based on timestamp
// //         return `AD${Date.now().toString().slice(-4)}`;
// //     }
// // };
// // POST route for creating orders

// const generateNextOrderId = async (prefix = 'AD') => {
//     try {
//         // Find the order with the highest orderId for the given prefix
//         const lastOrder = await prodOrderData.findOne({ orderId: new RegExp(`^${prefix}`) })
//             .sort('-orderId');
        
//         if (!lastOrder) {
//             return `${prefix}0001`; // First order for this prefix
//         }
        
//         // Extract the numeric part and increment
//         const lastNumber = parseInt(lastOrder.orderId.substring(2));
//         const nextNumber = lastNumber + 1;
        
//         // Format with leading zeros
//         return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
//     } catch (err) {
//         console.error("Error generating order ID:", err);
//         // Fallback - generate based on timestamp
//         return `${prefix}${Date.now().toString().slice(-4)}`;
//     }
// };


// // app.post('/prodOrders', async (req, res) => {
// //     try {
// //         // Generate the next order ID
// //         const orderId = await generateNextOrderId();
        
// //         // Create new order with the generated ID
// //         const newOrder = new prodOrderData({
// //             ...req.body,
// //             orderId: orderId
// //         });

// //         const savedOrder = await newOrder.save();
        
// //         // Return the order with its ID
// //         res.status(201).json({
// //             ...savedOrder.toObject(),
// //             orderId: orderId
// //         });
        
// //     } catch (err) {
// //         res.status(500).json({ message: err.message });
// //     }
// // });

// //DELETE


// // Enhanced POST route for creating orders
// // app.post('/prodOrders', async (req, res) => {
// //     try {
// //         // Determine prefix and status based on request
// //         const isUserOrder = req.body.status === "UserSideOrder";
// //         const prefix = isUserOrder ? "US" : "AD";
// //         const status = isUserOrder ? "UserSideOrder" : "Added Manually";
        
// //         // Generate appropriate order ID
// //         const orderId = await generateNextOrderId(prefix);
        
// //         // Process dates consistently
// //         const processDates = (dateObj) => {
// //             if (!dateObj) return null;
// //             const date = new Date(dateObj);
// //             return new Date(Date.UTC(
// //                 date.getFullYear(),
// //                 date.getMonth(),
// //                 date.getDate()
// //             ));
// //         };

// //         // Create new order with consistent data structure
// //         const newOrder = new prodOrderData({
// //             ...req.body,
// //             orderId: orderId,
// //             status: status,
// //             bookedDates: req.body.bookedDates.map(processDates).filter(d => d),
// //             booking: {
// //                 ...req.body.booking,
// //                 startDate: processDates(req.body.booking.startDate),
// //                 endDate: processDates(req.body.booking.endDate)
// //             }
// //         });

// //         const savedOrder = await newOrder.save();
// //         res.status(201).json(savedOrder);
// //     } catch (err) {
// //         console.error("Order creation error:", err);
// //         res.status(500).json({ 
// //             message: err.message || 'Failed to create order',
// //             details: err.errors 
// //         });
// //     }
// // });

// app.delete('/prodOrders/:id', async (req, res) => {
//     // try {
//     //     const deleted = await prodOrderData.findByIdAndDelete(req.params.id);
//     //     res.json(deleted);
//     // } catch (err) {
//     //     res.status(500).json({ message: err });
//     // }
//     try {
//         const deletedOrder = await prodOrderData.findByIdAndDelete(req.params.id);
//         if (!deletedOrder) {
//           return res.status(404).json({ message: 'Order not found' });
//         }
//         res.status(200).json({ message: 'Order deleted successfully' });
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//       }
// });


// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });


//PRODUCT ORDER STORED SECTION
// // GET 
// app.get('/prodOrders', async (req, res) => {
//     try {
//         const orders = await prodOrderData.find();
//         res.json(orders);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });
// GET orders by user ID




app.get('/prodOrders', async (req, res) => {
    try {
        const userId = req.query.userId;
        let query = {};
        
        if (userId) {
            query = { 'client.userId': userId };
        }
        
        const orders = await prodOrderData.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// GET single order
app.get('/prodOrders/:id', async (req, res) => {
    try {
      const order = await prodOrderData.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.status(200).json(order);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

// GET /booked-dates with exclusion
app.get('/booked-dates', async (req, res) => {
    try {
        const excludeOrderId = req.query.excludeOrderId;
        const query = excludeOrderId ? { _id: { $ne: excludeOrderId } } : {};
        
        const orders = await prodOrderData.find(query, 'products.bookedDates');
        const allDates = orders.flatMap(order => 
            // order.products.bookedDates.map(d => d.toISOString().split('T')[0])
 order.products.flatMap(product => 
                (product.bookedDates || []).map(d => 
                    new Date(d).toISOString().split('T')[0]
                ))

        );
        res.json([...new Set(allDates)]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


//FOR  USER SITE ORDER
// GET orders for specific user
app.get('/prodOrders/user/:userId', async (req, res) => {
    try {
        const orders = await prodOrderData.find({ 'client.userId': req.params.userId });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET cart items for specific user
app.get('/cart/user/:userId', async (req, res) => {
    try {
        const cartItems = await CartModel.find({ userId: req.params.userId });
        res.json(cartItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const existingOrder = await prodOrderData.findById(orderId);
        
//         if (!existingOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Extract only needed fields from request body
//         const { booking } = req.body;
        
//         // Validate required fields
//         if (!booking?.startDate || !booking?.endDate) {
//             return res.status(400).json({ message: 'Start and end dates are required' });
//         }

//         // Date parsing and validation
//         const startDate = new Date(booking.startDate);
//         const endDate = new Date(booking.endDate);
        
//         if (startDate > endDate) {
//             return res.status(400).json({ message: 'End date must be after start date' });
//         }

//         // Generate booked dates array
//         const newBookedDates = [];
//         const current = new Date(startDate);
//         current.setUTCHours(0, 0, 0, 0);
//         endDate.setUTCHours(0, 0, 0, 0);

//         while (current <= endDate) {
//             newBookedDates.push(new Date(current));
//             current.setDate(current.getDate() + 1);
//         }

//         // Check conflicts with other orders
//         const conflictCheck = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             bookedDates: { $in: newBookedDates }
//         });

//         if (conflictCheck) {
//             return res.status(409).json({
//                 message: 'Selected dates conflict with existing bookings',
//                 conflicts: conflictCheck._id
//             });
//         }

//         // Update only the necessary fields
//         existingOrder.booking = {
//             ...existingOrder.booking.toObject(),
//             startDate: startDate.toISOString(),
//             endDate: endDate.toISOString(),
//             totalDays: booking.totalDays,
//             totalPrice: booking.totalPrice
//         };
        
//         existingOrder.bookedDates = newBookedDates;
        
//         const updatedOrder = await existingOrder.save();
//         res.status(200).json(updatedOrder);

//     } catch (err) {
//         console.error('Update error:', err);
//         res.status(500).json({ 
//             message: err.message || 'Server error during update' 
//         });
//     }
// });




// //UPDATE




// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const existingOrder = await prodOrderData.findById(orderId);
        
//         if (!existingOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         const { booking } = req.body;
//         if (!booking || !booking.startDate || !booking.endDate) {
//             return res.status(400).json({ message: 'Start and end dates are required' });
//         }

//         // Parse and validate dates
//         const startDate = new Date(booking.startDate);
//         const endDate = new Date(booking.endDate);
        
//         if (isNaN(startDate.getTime())) {
//             return res.status(400).json({ message: 'Invalid start date' });
//         }
//         if (isNaN(endDate.getTime())) {
//             return res.status(400).json({ message: 'Invalid end date' });
//         }
//         if (startDate > endDate) {
//             return res.status(400).json({ message: 'End date must be after start date' });
//         }

//         // Normalize dates to UTC midnight
//         startDate.setUTCHours(0, 0, 0, 0);
//         endDate.setUTCHours(0, 0, 0, 0);

//         // Generate new booked dates range
//         const newBookedDates = [];
//         const current = new Date(startDate);
//         while (current <= endDate) {
//             newBookedDates.push(new Date(current));
//             current.setDate(current.getDate() + 1);
//         }

//         // Check for conflicts in other orders
//         const conflictingOrders = await prodOrderData.find({
//             _id: { $ne: orderId }, // Exclude current order from check
//             bookedDates: { 
//                 $in: newBookedDates.map(date => date.toISOString()) 
//             }
//         });

//         if (conflictingOrders.length > 0) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflicts: conflictingOrders.map(o => o._id)
//             });
//         }

//         // Update order with new dates and data
//         const updatedData = {
//             ...req.body,
//             bookedDates: newBookedDates
//         };

//         const updatedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             updatedData,
//             { new: true, runValidators: true }
//         );

//         res.status(200).json(updatedOrder);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });





// POST route for creating orders





// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const { products, ...updateData } = req.body;
        
//         // Validate products
//         if (!products || !Array.isArray(products)) {
//             return res.status(400).json({ message: 'Products array is required' });
//         }
        
//         // Check for date conflicts with other orders
//         const allDates = products.flatMap(p => 
//             (p.bookedDates || []).map(d => new Date(d).toISOString().split('T')[0])
//         );
        
//         const conflict = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             'products.bookedDates': { 
//                 $in: allDates.map(d => new Date(d)) 
//             }
//         });
        
//         if (conflict) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflictOrderId: conflict._id
//             });
//         }
        
//         // Update the order
//         const updatedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             { 
//                 ...updateData,
//                 products: products.map(p => ({
//                     ...p,
//                     bookedDates: (p.bookedDates || []).map(d => new Date(d))
//                 }))
//             },
//             { new: true, runValidators: true }
//         );
        
//         if (!updatedOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }
        
//         res.json(updatedOrder);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });






const generateNextOrderId = async (prefix = 'AD') => {
    try {
        // Find the order with the highest orderId for the given prefix
        const lastOrder = await prodOrderData.findOne({ orderId: new RegExp(`^${prefix}`) })
            .sort('-orderId');
        
        if (!lastOrder) {
            return `${prefix}0001`; // First order for this prefix
        }
        
        // Extract the numeric part and increment
        const lastNumber = parseInt(lastOrder.orderId.substring(2));
        const nextNumber = lastNumber + 1;
        
        // Format with leading zeros
        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (err) {
        console.error("Error generating order ID:", err);
        // Fallback - generate based on timestamp
        return `${prefix}${Date.now().toString().slice(-4)}`;
    }
};



// app.post('/prodOrders', async (req, res) => {
//     try {
//         // Determine prefix based on status or other criteria
//         const prefix = req.body.status === "UserSideOrder" ? "US" : "AD";
//         const orderId = await generateNextOrderId(prefix);
        
//         // Create new order with the generated ID
//         const newOrder = new prodOrderData({
//             ...req.body,
//             orderId: orderId
//         });

//         const savedOrder = await newOrder.save();
        
//         res.status(201).json(savedOrder);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });


// server.js (updated)MAIN POST 
app.post('/prodOrders', async (req, res) => {
    try {


        // Validate request body
        if (!req.body.products || !Array.isArray(req.body.products) || req.body.products.length === 0) {
            return res.status(400).json({ message: 'At least one product is required' });
        }

        // Determine prefix based on status or other criteria
        const prefix = req.body.status === "UserSideOrder" ? "US" : "AD";
        const orderId = await generateNextOrderId(prefix);
        
        // // For cart orders, we need to handle products array differently
        // let products = [];
        // if (req.body.orderType === "cart") {
        //     products = req.body.products || [];
        // } else {
        //     // For single product orders
        //     products = [req.body.product];
        // }
 // Validate and normalize products
        const products = req.body.products.map(product => {
            if (!product) {
                throw new Error('Invalid product data');
            }
            
            // Ensure bookedDates is an array of valid dates
            const bookedDates = (product.bookedDates || []).map(d => {
                const date = new Date(d);
                if (isNaN(date.getTime())) {
                    throw new Error('Invalid date in bookedDates');
                }
                return date;
            });
            
            return {
                ...product,
                bookedDates
            };
        });

        // Create new order with the generated ID
        const newOrder = new prodOrderData({
            ...req.body,
            orderId: orderId,
            products: products,
             createdAt: new Date()
            // product: products[0] // Keep single product reference for backward compatibility
        });

        const savedOrder = await newOrder.save();
        
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(500).json({ message: err.message || 'Failed to create order',
            error: true });
    }
});


// Helper function to generate date range
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

// Get orders with user filter
app.get('/prodOrders', async (req, res) => {
    try {
        let query = {};
        
        if (req.query.userId) {
            query = { 'client.userId': req.query.userId };
        }
        
        const orders = await prodOrderData.find(query)
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});




// Improved date conflict checking middleware
const checkDateConflicts = async (req, res, next) => {
  try {
    const { products } = req.body;
    const orderId = req.params.id;
    
    const allDates = products.flatMap(p => 
      p.bookedDates.map(d => d.toISOString().split('T')[0])
    );

    // Check other orders for conflicts
    const conflict = await prodOrderData.findOne({
      _id: { $ne: orderId },
      "products.bookedDates": { $in: allDates },
      "products.productId": { $in: products.map(p => p.productId) }
    });

    if (conflict) {
      return res.status(409).json({
        message: 'Date conflict with existing bookings',
        conflicts: conflict._id
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

// // Update route with conflict checking
// app.put('/prodOrders/:id', checkDateConflicts, async (req, res) => {
//   try {
//     const updatedOrder = await prodOrderData.findByIdAndUpdate(
//       req.params.id,
//       { $set: { 
//         "products.$[elem].booking": req.body.products[0].booking,
//         "products.$[elem].bookedDates": req.body.products[0].bookedDates 
//       }},
//       { 
//         new: true,
//         arrayFilters: [{ "elem._id": req.body.products[0]._id }]
//       }
//     );
//     res.json(updatedOrder);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });



// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const { products, ...updateData } = req.body;
        
//         // Validate products
//         if (!products || !Array.isArray(products)) {
//             return res.status(400).json({ message: 'Products array is required' });
//         }
        
//         // Check for date conflicts with other orders
//         const allDates = products.flatMap(p => 
//             p.bookedDates.map(d => new Date(d).toISOString().split('T')[0])
//         );
        
//         const conflict = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             'products.bookedDates': { 
//                 $in: allDates.map(d => new Date(d)) 
//             }
//         });
        
//         if (conflict) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflictOrderId: conflict._id
//             });
//         }
        
//         // Update the order
//         const updatedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             { 
//                 ...updateData,
//                 products: products.map(p => ({
//                     ...p,
//                     bookedDates: p.bookedDates.map(d => new Date(d))
//                 }))
//             },
//             { new: true, runValidators: true }
//         );
        
//         if (!updatedOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }
        
//         res.json(updatedOrder);
//     } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// });



// app.put('/prodOrders/:id', async (req, res) => {
//     try {
//         const orderId = req.params.id;
//         const { products, ...updateData } = req.body;
        
//         // Validate required fields
//         if (!products || !Array.isArray(products)) {
//             return res.status(400).json({ message: 'Products array is required' });
//         }

//         // Get existing order
//         const existingOrder = await prodOrderData.findById(orderId);
//         if (!existingOrder) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Validate each product's booking dates
//         for (const product of products) {
//             if (product.booking) {
//                 if (!product.booking.startDate || !product.booking.endDate) {
//                     return res.status(400).json({ 
//                         message: 'Both start and end dates are required for each product booking'
//                     });
//                 }
                
//                 const startDate = new Date(product.booking.startDate);
//                 const endDate = new Date(product.booking.endDate);
                
//                 if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
//                     return res.status(400).json({ message: 'Invalid date format' });
//                 }
                
//                 if (startDate > endDate) {
//                     return res.status(400).json({ message: 'End date must be after start date' });
//                 }
//             }
//         }

//         // Check for date conflicts
//         const allDates = products.flatMap(p => 
//             (p.bookedDates || []).map(d => new Date(d).toISOString().split('T')[0])
//         );
        
//         const conflict = await prodOrderData.findOne({
//             _id: { $ne: orderId },
//             'products.bookedDates': { 
//                 $in: allDates.map(d => new Date(d)) 
//             }
//         });
        
//         if (conflict) {
//             return res.status(409).json({
//                 message: 'Date conflict with existing bookings',
//                 conflictOrderId: conflict._id,
//                 conflictingDates: allDates.filter(date => 
//                     conflict.products.some(p => 
//                         p.bookedDates.some(d => 
//                             new Date(d).toISOString().split('T')[0] === date
//                         )
//                     )
//                 )
//             });
//         }

//         // Merge updates with existing order
//         const updatedOrder = {
//             ...existingOrder.toObject(),
//             ...updateData,
//             products: products.map((p, index) => ({
//                 ...(existingOrder.products[index] || {}),
//                 ...p,
//                 bookedDates: (p.bookedDates || []).map(d => new Date(d))
//             }))
//         };

//         // Save updated order
//         const savedOrder = await prodOrderData.findByIdAndUpdate(
//             orderId,
//             updatedOrder,
//             { new: true, runValidators: true }
//         );

//         res.json(savedOrder);
//     } catch (err) {
//         res.status(500).json({ 
//             message: err.message,
//             stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
//         });
//     }
// });
app.put('/prodOrders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { products } = req.body;
        
        // Validate products array
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ message: 'Products array is required' });
        }

        // Check for date conflicts
        const allDates = products.flatMap(p => 
            (p.bookedDates || []).map(d => new Date(d).toISOString().split('T')[0])
        );
        
        const conflict = await prodOrderData.findOne({
            _id: { $ne: orderId },
            'products.bookedDates': { 
                $in: allDates.map(d => new Date(d)) 
            }
        });
        
        if (conflict) {
            return res.status(409).json({
                message: 'Date conflict with existing bookings',
                conflictOrderId: conflict._id
            });
        }
        
        // Prepare updated products data
        const updatedProducts = products.map(p => ({
            ...p,
            bookedDates: (p.bookedDates || []).map(d => new Date(d)),
            booking: p.booking ? {
                ...p.booking,
                startDate: p.booking.startDate ? new Date(p.booking.startDate) : null,
                endDate: p.booking.endDate ? new Date(p.booking.endDate) : null,
                totalDays: p.booking.totalDays || 
                    (p.booking.startDate && p.booking.endDate ? 
                        Math.ceil((new Date(p.booking.endDate) - new Date(p.booking.startDate)) / (1000 * 60 * 60 * 24)) + 1 : 
                        0)
            } : null
        }));

        // Update the order
        const updatedOrder = await prodOrderData.findByIdAndUpdate(
            orderId,
            { 
                $set: { products: updatedProducts },
                $currentDate: { updatedAt: true }
            },
            { 
                new: true, 
                runValidators: true,
                context: 'query' 
            }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json({
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder
        });
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error while updating order',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

app.delete('/prodOrders/:id', async (req, res) => {

    try {
        const deletedOrder = await prodOrderData.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
          return res.status(404).json({ message: 'Order not found' });
        }
        res.status(200).json({ message: 'Order deleted successfully' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

