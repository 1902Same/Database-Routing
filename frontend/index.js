// const axios = require("axios");

const url = "http://localhost:5000"
function Signup() {
    axios({
        method: 'post',
        url: "http://localhost:5000/signup",
        data: {
            name: document.getElementById("sname").value,
            email: document.getElementById("semail").value,
            password: document.getElementById("spassword").value,
            phone: document.getElementById("snumber").value,
            gender: document.getElementById("sgender").value
        }
    })
        .then(function (response) {
            if (response.data.status === 200) {
                alert(response.data.message);
                window.location.href = "login.html"
            }
            else {
                alert(response.data.message);
            }
        })
        .catch(function (error) {
            console.log(error);
        });
    return false;
}

function Login() {
    axios({
        method: 'post',
        url: "http://localhost:5000/login",
        data: {
            email: document.getElementById("lemail").value,
            password: document.getElementById("lpassword").value
        }, withCredentials: true
    })
        .then((response) => {
            if (response.data.status === 200) {
                alert(response.data.message);
                window.location.href = "profile.html"
            }
            else {
                alert(response.data.message);
            }
        })
        .catch(function (error) {
            console.log(error);
            // alert(error);
        });
    return false;
}

function Profile() {
    axios({
        method: 'get',
        url: "http://localhost:5000/profile"
    })
        .then((response) => {
            document.getElementById("pname").innerHTML = response.data.profile.name
            document.getElementById("pemail").innerHTML = response.data.profile.email,
                document.getElementById("pphone").innerHTML = response.data.profile.phone,
                document.getElementById("pgender").innerHTML = response.data.profile.gender
        });
}