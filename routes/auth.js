var express = require("express");
var bcrypt = require('bcrypt-inzi');
var jwt = require('jsonwebtoken');
var { userModel, otpModel } = require("../dbrepo/models");
var api = express.Router();
var postmork = require("postmark")
var { SERVER_SECRET } = require("../core/app");
const { response } = require("express");

var client = new postmork.Client("35cebacb-d58e-403b-aa4d-34d8cab6c422");

api.post("/signup", (req, res, next) => {
    if (!req.body.name || !req.body.email || !req.body.password || !req.body.phone || !req.body.gender) {
        res.status(403).send(`
            please send name, email, passwod, phone and gender in json body.
            e.g:
            {
                "name": "abdul",
                "email": "abdul@gmail.com",
                "password": "abc",
                "phone": "03001234567",
                "gender": "Male"
            }`);
        return;
    }
    userModel.findOne({ email: req.body.email }, function (err, doc) {
        if (!err && !doc) {
            bcrypt.stringToHash(req.body.password).then(function (hash) {
                var newUser = new userModel({
                    "name": req.body.name,
                    "email": req.body.email,
                    "password": hash,
                    "phone": req.body.phone,
                    "gender": req.body.gender,
                });
                newUser.save((err, data) => {
                    // console.log(data);
                    if (!err) {
                        res.send({
                            message: "Signup Successfuly",
                            status: 200,
                            data: data
                        });
                    }
                    else {
                        console.log(err);
                        res.status(500).send({
                            message: "User create error, " + err
                        });
                    }
                });
            });
        }
        else if (err) {
            res.send({
                message: "DB Error" + err,
                status: 500
            });
        }
        else {
            res.send({
                message: "User already exist!",
                status: 409
            });
        }
    })
});

api.post("/login", (req, res, next) => {
    if (!req.body.email || !req.body.password) {
        res.send(`
            please send email and passwod in json body.
            e.g:
            {
                "email": "abdul@gmail.com",
                "password": "abc",
            }`)
        // return;
    }

    userModel.findOne({ email: req.body.email }, function (err, data) {
        if (err) {
            console.log(err);
            res.status(500).send({
                message: "An error occured: " + JSON.stringify(err)
            });
        }
        else if (data) {
            console.log(req.body.email);
            bcrypt.varifyHash(req.body.password, data.password).then(isMatched => {
                if (isMatched) {
                    console.log("Matched");

                    let tocken = jwt.sign({
                        id: data._id,
                        name: data.name,
                        email: data.email,
                        phone: data.phone,
                        gender: data.gender,
                        // ip: req.connection.remoteAddress
                    }, SERVER_SECRET)

                    res.cookie('jTocken', tocken, {
                        maxAge: 86_400_000,
                        httpOnly: true
                    });

                    res.send({
                        message: "Login Success",
                        user: {
                            name: data.name,
                            email: data.email,
                            phone: data.phone,
                            gender: data.gender,
                        },
                    });
                }
                else {
                    console.log("Password not matched");
                    res.send({
                        message: "Incorrect Password",
                        status: 409
                    });
                }
            }).catch(e => {
                console.log("Error: ", e)
            });
        }
        else {
            res.send({
                message: "User not found",
                status: 403
            });
        }
    });
});

api.post("/logout", (req, res, next) => {
    res.cookie('jTocken', "", {
        maxAge: 86_400_000,
        httpOnly: true
    });
    res.send("Logout Success");
});

api.post("/forgot-password", (req, res, next) => {
    if (!req.body.email) {
        res.send({
            message: "Please send email in JSON body",
            status: 403
        });
        return;
    }
    userModel.findOne({ email: req.body.email }, function (err, user) {
        if (err) {
            res.send({
                message: "An error occured : " + JSON.stringify(err)
            });
        }
        else if (user) {
            console.log(user);
            const otp = Math.floor(getRandomArbitrary(11111, 99999));

            otpModel.create({
                email: req.body.email,
                otpCode: otp
            }).then((doc) => {
                client.sendEmail({
                    "From": "abdullah_student@sysborg.com",
                    "To": req.body.email,
                    "Subject": "Reset your password",
                    "TextBody": `Here is your pasword reset code: ${otp}`
                }).then((status) => {
                    console.log("Status :", status);
                    res.send({
                        message: "Email Send  With Otp"
                    });
                }).catch((err) => {
                    console.log("error in creating otp: ", err);
                    res.send({
                        message: "Unexpected Error",
                        status: 500
                    });
                });
            }).catch((err) => {
                console.log("error in creating otp: ", err);
                res.send({
                    message: "Unexpected Error",
                    status: 500
                });
            });
        }
        else {
            res.send({
                message: "User Not Found",
                status: 403
            });
        }
    });
});

api.post("//forgot-password-step2", (req, res, next) => {
    if (!req.body.email || !req.body.otp || !req.body.newPassword) {
        res.send({
            message: "Please required Email, Otp & New Password",
            status: 403
        });
        return;
    }
    userModel.findOne({ email: req.body.email }, function (err, user) {
        if (err) {
            res.send({
                message: "An Error Occure " + JSON.stringify(err),
                status: 500
            });
        }
        else if (user) {
            otpModel.find({ email: req.body.email }, function (err, otpData) {
                if (err) {
                    res.send({
                        message: "An Error Occure " + JSON.stringify(err),
                        status: 500
                    });
                }
                else if (otpData) {
                    otpData = otpData[otpData.length - 1]

                    console.log("otpData: ", otpData);

                    const now = new Date().getTime();
                    const otpIat = new Date(otpData.createdOn).getTime(); // 2021-01-06T13:08:33.657+0000
                    const diff = now - otpIat; // 300000 5 minute

                    console.log("diff: ", diff);

                    if (otpData.otpCode === req.body.otp && diff < 300000) { // correct otp code
                        otpData.remove();

                        bcrypt.stringToHash(req.body.newPassword).then(function (hash) {
                            user.update({ password: hash }, {}, function (err, data) {
                                res.send("password updated");
                            });
                        });
                    }
                    else {
                        res.status(401).send({
                            message: "incorrect otp"
                        });
                    }
                }
                else {
                    res.status(401).send({
                        message: "incorrect otp"
                    });
                }
            });
        }
        else {
            res.send({
                message: "User Not Found",
                status: 409
            });
        }
    });
});

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

module.exports = api;