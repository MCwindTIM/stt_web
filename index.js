const WebServer = require('./Core/Server.js');
const DS = require('./Core/DS.js');
const fs = require('fs');
//COMMENT: fetch lib for huggingFace api query
const fetch = require('node-fetch');

//COMMENT: FFmpeg
var ffmpeg = require('fluent-ffmpeg');

//TODO: implement Config module
const Config = require('./Core/Config.js');

class STTServer{
    constructor(){
        this.config = new Config();
        //NOTE: Web interface
        this.WebServer = new WebServer(this);
    }

    convert = (input, output, callback) => {
        ffmpeg(input).output(output).on('end', ()=>{
            console.log('Convert to WAV')
            callback(null);
        }).on('error', (err)=> {
            console.log(err);
            callback(err);
        }).run();
    }
    
    //TODO: This function need to clarify
    uploadFinish = (fileName, socketid) => {
        //check file is wav
        if(fileName.split('.').pop() != 'wav'){
            //convert to wav
            this.convert(`${this.config.uploadPath}${fileName}`, `${this.config.uploadPath}${fileName.split('.').shift()}.wav`, (err)=>{
                if(err) return this.WebServer.apiError(socketid);
                //update fileName
                fileName = `${fileName.split('.').shift()}.wav`;
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
            });
        }else{
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
            this.config.modelAPI,
            {
                // headers: {},
                method: "POST",
                body: JSON.stringify({
                    "text": result,
                }),
            }   
        );
        let APIresult = await response.json();
        //COMMENT: response: {
        //   Recieved: 'He were moving there',
        //   Model_Output: [ 'He was moving there.', 'He were moving there.' ]
        // }
        console.log(APIresult);
        if(!APIresult.output) return this.WebServer.apiError(socketid);

        //COMMENT: save result in to txt 
        fs.writeFileSync(`${fileName}`, APIresult.output.join('\n'), (err) => {
            if(err) return console.log(err);
        });
        
        //TODO: update web interface
        this.WebServer.downloadBtn(socketid, {url: fileName, ds: result, gec: APIresult.output})
        return APIresult;
    }
}

//NOTE: start here
let sttServer = new STTServer();

