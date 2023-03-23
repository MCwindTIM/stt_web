const WebServer = require('./Core/Server.js');
const DS = require('./Core/DS.js');
const fs = require('fs');
//COMMENT: fetch lib for huggingFace api query
const fetch = require('node-fetch');

//TODO: implement Config module
const Config = require('./Core/Config.js');

class STTServer{
    constructor(){
        this.config = new Config();
        //NOTE: Web interface
        this.WebServer = new WebServer(this);
    }
    
    //TODO: This function need to clarify
    uploadFinish = (fileName, socketid) => {
        let deepspeech = new DS(this);
        if(deepspeech.setFilePath(fileName)){
            //NOTE: check Audio file exists and no result file was generated
            if(deepspeech.checkAudioFileExists()){
                //NOTE: read audio file
                if(deepspeech.readFile()){
                    console.log(`[${deepspeech.getAudioFilePath()}] → [${deepspeech.getOutputFilePath()}]`)
                    //NOTE: call pipeBuffer() function to process stt
                    deepspeech.pipeBuffer(socketid);
                }
            }
        }
    }

    sttFinish = async (fileName, result, socketid) => {
        console.log(`[${new Date().toLocaleTimeString()}][${fileName}]: ${result}`)
        //COMMENT: if folder not exist, create one
        if (!fs.existsSync(this.config.savePath)) {
            fs.mkdirSync(this.config.savePath);
        }
        //COMMENT: save result in to txt 
        fs.writeFileSync(fileName, result, (err) => {
            if(err) return console.log(err);
        });

        //COMMENT: huggingface api query
        let response = await fetch(
            "https://api-inference.huggingface.co/models/vennify/t5-base-grammar-correction",
            {
                headers: { Authorization: `Bearer ${this.config.api_token}` },
                method: "POST",
                body: JSON.stringify({
                    "inputs": `${result}`,
                    "options":  {
                        "wait_for_model":true
                    },
                    "parameters": {
                        "max_length": 256
                    }
                }),
            }   
        );
        let APIresult = await response.json();
        //COMMENT: response: {"generated_text": "XXXXX"}
        console.log(APIresult);
        if(!APIresult[0].generated_text) return this.WebServer.apiError(socketid);

        //COMMENT: save result in to txt 
        fs.writeFileSync(`${fileName}`, APIresult[0].generated_text, (err) => {
            if(err) return console.log(err);
        });
        
        //TODO: update web interface
        console.log(socketid);
        this.WebServer.downloadBtn(socketid, `${fileName}`)
        return APIresult;
    }
}

//NOTE: start here
let sttServer = new STTServer();

