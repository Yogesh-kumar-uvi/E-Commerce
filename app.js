if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo');
const User = require('./models/User');

const MONGO_URL = process.env.MONGO_URL; 
const SECRET = process.env.SECRET || 'weneedabettersecretkey';
const PORT = process.env.PORT || 5000; 

mongoose.set('strictQuery', true);
mongoose
    .connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('DB Connected'))
    .catch((err) => console.log('DB Connection Error:', err));

// Set up EJS engine and views
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// MongoDB session store
const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    secret: SECRET,
    touchAfter: 24 * 60 * 60, // Update session data only once per day
});

store.on('error', (e) => {
    console.log('Session Store Error', e);
});

const sessionConfig = {
    store,
    name: 'session_id', // Change session cookie name for security
    secret: SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, // Prevent client-side access
        secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1-week expiry
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
};

app.use(session(sessionConfig));
app.use(flash());

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash and user info middleware
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Routes
const productRoutes = require('./routes/product');
const reviewRoutes = require('./routes/review');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const productApi = require('./routes/api/productapi');
const paymentRoutes = require('./routes/payment');

// Seed database (optional, comment out after first use)
// const seedDB = require('./seed');
// seedDB();

app.get('/', (req, res) => {
    res.render('home');
});

// Use routes
app.use(productRoutes);
app.use(reviewRoutes);
app.use(authRoutes);
app.use(cartRoutes);
app.use(productApi);
app.use(paymentRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
