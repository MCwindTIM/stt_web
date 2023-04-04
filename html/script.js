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
    console.log(data)
    window.location.href = data.url;
    
    document.getElementById("files").disabled = false;
    document.getElementById("submit").disabled = false;
    document.getElementById("submit").style.background = "rgb(37, 83, 3)";
    document.getElementById("submit").textContent = "Upload";

    document.getElementById("DeepSpeechTextBox").textContent = data.ds;
    document.getElementById("T5GECTextBox").textContent = data.gec.join("\n\n");
});

socket.on('error', data => {
    alert(data.error);
})

function submitForm(e) {
    e.preventDefault();
    const file = document.getElementById("files").files[0];
    const formData = new FormData();
    formData.append("sttTarget", file);
    //disable btn
    document.getElementById("submit").disabled = true;
    //change color to grey
    document.getElementById("submit").style.background = "grey";
    document.getElementById("submit").textContent = "Loading";
    
    //disable file select
    document.getElementById("files").disabled = true;
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