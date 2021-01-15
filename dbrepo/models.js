var mongoose = require('mongoose');

let dbURI = "mongodb+srv://root:root@cluster0.cnbo3.mongodb.net/testdb?retryWrites=true&w=majority";
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });

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

var userSchema = new mongoose.Schema({
    "name": String,
    "email": String,
    "password": String,
    "phone": String,
    "gender": String,
    "createdOn": { "type": Date, "default": Date.now },
    "activeSince": Date
});

var userModel = mongoose.model("users", userSchema);

var otpSchema = new mongoose.Schema({
    "email": String,
    "otpCode": String,
    "createdOn": { "type": Date, "default": Date.now },
});

var otpModel = mongoose.model("otp", otpSchema);

module.exports = {
    userModel: userModel,
    otpModel: otpModel,
}