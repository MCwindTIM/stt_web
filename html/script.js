const form = document.getElementById("form");

form.addEventListener("submit", submitForm);

var socketID = null;

//io connection
var socket = io.connect();
socket.on('id', function (data) {
    console.log(data.id);
    socketID = data.id;
});
socket.on('finish', function (data) {
    console.log(data.url)
    window.location.href = data.url;
});

socket.on('error', data => {
    alert(data.error);
})

function submitForm(e) {
    e.preventDefault();
    const file = document.getElementById("files").files[0];
    const formData = new FormData();
    formData.append("sttTarget", file);
    fetch("./upload-sttTarget", {
        method: 'POST',
        body: formData,
        headers: {
        //   "Content-Type": "multipart/form-data",
            "socketID": socketID
        }
    })
        .then((res) => console.log(res))
        .catch((err) => ("Error occured", err));
}