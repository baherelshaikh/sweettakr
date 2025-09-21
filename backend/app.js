require('express-async-errors')
const express = require("express");
const authRoute = require("./routes/auth");
const chatRoutes = require("./routes/chatRoute");
const messageRoutes = require("./routes/messageRoute");
const userRoutes = require("./routes/userRoute");
const cors = require("cors");
const rateLimiter = require('express-rate-limit')
const helmet = require('helmet')


const NotFoundError = require('./middleware/not-found')
const errorHandlerMiddleware = require('./middleware/error-handler')



const app = express(); 

// security
app.set('trust proxy', 1);
app.use(
    rateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 60,
    })
    );
app.use(helmet());

app.use(cors());
app.use(express.json());

app.use("/", (req, res) => {
    res.status(200).send("<h1>✅ API is running...!</h1>")
});

app.use(express.json())
// app.use(cookieParser(process.env.JWT_SECRET))

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/users", userRoutes)

app.use(NotFoundError)
app.use(errorHandlerMiddleware);


module.exports = app;

