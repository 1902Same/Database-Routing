var express = require("express");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var morgan = require('morgan');
const mongoose = require('mongoose');
var bcrypt = require("bcrypt-inzi");
var jwt = require('jsonwebtoken');
var path = require('path');

var SERVER_SECRET = process.env.SECRET || "1234";


/////////////////////////////////////////////////////////////////////////
let dbURI = "mongodb+srv://root:root@cluster0.cnbo3.mongodb.net/testdb?retryWrites=true&w=majority";
// let dbURI = 'mongodb://localhost:27017/abc-database';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

//https://mongoosejs.com/docs/connections.html#connection-events
////////////////mongodb connected disconnected events///////////////////////////////////////////////
mongoose.connection.on('connected', function () { //connected
    console.log("Mongoose in connected");
});

mongoose.connection.on('disconnected', function () { //disconnected
    console.log("Mongoose is disconnected");
    process.exit(1);
});

mongoose.connection.on('error', function (err) { //any error
    console.log("Mongoose connection error: ", err);
    process.exit(1);
})

process.on('SIGINT', function () {//this function will run jst before app is closing
    console.log("App is terminating");
    mongoose.connection.close(function () {
        console.log("Mongoose default connection closed");
        process.exit(0);
    });
});

////////////////mongodb connected disconnected events///////////////////////////////////////////////

// https://mongoosejs.com/docs/schematypes.html#what-is-a-schematype
var userSchema = new mongoose.Schema({
    "name": String,
    "email": String,
    "password": String,
    "phone": String,
    "gender": String,
    "createdOn": { "type": Date, "default": Date.now },
    "activeSince": Date
});

// https://mongoosejs.com/docs/models.html
var userModel = mongoose.model("users", userSchema);

var app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(morgan('dev'));
app.use("/", express.static(path.resolve(path.join(__dirname, "frontend"))));

app.post("/signup", (req, res, next) => {
    if (!req.body.name
        || !req.body.email
        || !req.body.password
        || !req.body.phone
        || !req.body.gender) {

        res.status(403).send(`
            please send name, email, passwod, phone and gender in json body.
            e.g:
            {
                "name": "abdul",
                "email": "abdul@gmail.com",
                "password": "abc",
                "phone": "03001234567",
                "gender": "Male"
            }`)
        return;
    }

    // https://mongoosejs.com/docs/models.html#constructing-documents
    userModel.findOne({ email: req.body.email },
        function (err, doc) {
            if (!err & !doc) {

                bcrypt.stringToHash(req.body.password).then(function (hash) {
                    var newUser = new userModel({
                        "name": req.body.name,
                        "email": req.body.email,
                        "password": hash,
                        "phone": req.body.phone,
                        "gender": req.body.gender,
                    });

                    newUser.save((err, data) => {
                        if (!err) {
                            res.send({
                                message: "user created"
                            });
                        } else {
                            console.log(err);
                            res.status(500).send({
                                message: "user create error, " + err
                            });
                        }
                    });
                });
            }
            else if (err) {
                res.status(500).send({
                    message: "db error"
                })
            }
            else {
                res.status(409).send({
                    message: "user already exist"
                });
            }
        })
});

app.post("/login", (req, res, next) => {
    if (!req.body.email || !req.body.password) {

        res.status(403).send(`
            please send email and passwod in json body.
            e.g:
            {
                "email": "abdul@gmail.com",
                "password": "abc",
            }`)
        return;
    }

    userModel.findOne({ email: req.body.email },
        function (err, user) {
            if (err) {
                res.status(500).send({
                    message: "An error occured: " + JSON.stringify(err)
                });
            }
            else if (user) {

                bcrypt.varifyHash(req.body.password, user.password).then(isMatched => {
                    if (isMatched) {
                        console.log("Matched");

                        var tocken = jwt.sign({
                            id: user._id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            gender: user.gender,
                            ip: req.connection.remoteAddress
                        }, SERVER_SECRET)

                        res.cookie('jTocken', tocken, {
                            maxAge: 86_400_000,
                            httpOnly: true
                        })

                        res.send({
                            message: "Login Success",
                            user: {
                                name: user.name,
                                email: user.email,
                                phone: user.phone,
                                gender: user.gender,
                            }
                        });
                    }
                    else {
                        console.log("not matched");
                        res.status(401).send({
                            message: "incorrect password"
                        })
                    }
                }).catch(e => {
                    console.log("error: ", e)
                })
            }
            else {
                res.status(403).send({
                    message: "user not found"
                });
            }
        });
});

app.use(function (req, res, next) {
    console.log("req.cookies: ", req.cookies);
    if (!req.cookies.jTocken) {
        res.status(401).send("include http-only credentials with every request")
        return;
    }
    jwt.verify(req.cookies.jTocken, SERVER_SECRET, function (err, decodeData) {
        if (!err) {
            const issueDate = decodeData.iat * 1000;
            const nowDate = new Date().getTime();
            const diff = nowDate - issueDate; //86400,000

            if (diff > 300000) {//// expire after 5 min (in milis)
                res.status(401).send("Tocken Expired")
            }
            else { //issue new tocken
                var tocken = jwt.sign({
                    id: decodeData.id,
                    name: decodeData.name,
                    email: decodeData.email,
                }, SERVER_SECRET)
                res.cookie('jTocken', tocken, {
                    maxAge: 86_400_000,
                    httpOnly: true
                });
                req.body.jTocken = decodeData
                next();
            }
        }
        else {
            res.status(401).send("invalid token")
        }
    });
});

app.get("/profile", (req, res, next) => {
    console.log(req.body);

    userModel.findById(req.body.jTocken.id, 'name email phone gender createdOn',
        function (err, doc) {
            if (!err) {
                res.send({
                    profile: doc
                });
            }
            else {
                res.status(500).send({
                    message: "Server error"
                });
            }
        });
});

app.post("/logout", (req, res, next) => {
    res.cookie('jTocken', "", {
        maxAge: 86_400_000,
        httpOnly: true
    });
    res.send("Logout Success");
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("server is running on: ", PORT);
});