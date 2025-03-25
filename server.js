const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Debug: Log current working directory and expected config.env path
console.log('Current working directory:', process.cwd());
const configPath = path.resolve(__dirname, './config.env');
console.log('Looking for config.env at:', configPath);

// Load environment variables
const result = dotenv.config({ path: configPath, debug: true });
if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

// Debug: Log parsed environment variables
console.log('Loaded env vars:', {
    APP_ATLAS_CONNECTION_STRING: process.env.APP_ATLAS_CONNECTION_STRING,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET
});

// Validate critical environment variables
const requiredEnvVars = ['APP_ATLAS_CONNECTION_STRING', 'SESSION_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
        console.error(`Error: Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

console.log('ENV TEST:', process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);

// Rest of your code (unchanged)...
const express = require('express');
const app = express();
const ejs = require('ejs');
const expressLayout = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('express-flash');
const MongoStore = require('connect-mongo')(session);
const Emitter = require('events');

app.listen(process.env.PORT || 10000, '0.0.0.0', () => {
  console.log(`Listening on port ${process.env.PORT || 10000}`);
});

const DB = process.env.APP_ATLAS_CONNECTION_STRING;
mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('DB connected successfully!...'))
    .catch((err) => {
        console.error('Connection failed:', err);
        process.exit(1);
    });

const connection = mongoose.connection;

const eventEmitter = new Emitter();
app.set('eventEmitterKey', eventEmitter);

const mongoStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions',
});

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    store: mongoStore,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(flash());
app.use(cookieParser());

app.use(expressLayout);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/resources/views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(process.cwd()));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

const webRouter = require('./routes/webRouter');
app.use('/', webRouter);

const server = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

const io = require('socket.io')(server);
io.on('connection', (socket) => {
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
    });
});

eventEmitter.on('statusUpdate', (data) => {
    const roomName = `order_${data.orderID}`;
    io.to(roomName).emit('statusUpdateFromServer', data);
});

eventEmitter.on('orderPlaced', () => {
    io.to('adminRoom').emit('orderPlaceFromServer');
});

eventEmitter.on('orderCancelled', () => {
    io.to('adminRoom').emit('orderCancelFromServer');
});
