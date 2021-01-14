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
            console.log(response.data.message);
            alert(response.data.message);
            // window.location.href = "login.html"
        })
        .catch(function (error) {
            console.log(error);
        });
    return false;
}