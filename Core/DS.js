const DeepSpeech = require('deepspeech');
const Fs = require('fs');
const Sox = require('sox-stream');
const MemoryStream = require('memory-stream');
const Duplex = require('stream').Duplex;
const Wav = require('node-wav');

module.exports = class DS {
	constructor(main) {
		this.main = main;
		this.modelPath =  this.main.config.modelPath;
		this.model = new DeepSpeech.Model(this.modelPath);
		this.desiredSampleRate = this.model.sampleRate();
		this.scorerPath = this.main.config.scorerPath;
		this.model.enableExternalScorer(this.scorerPath);
		this.audioFile = null;
		this.outputFile = null;
		this.buffer = null;
		this.audioStream = null;
		this.sox = new Sox({
			global: {
				'no-dither': true,
			},
			output: {
				bits: 16,
				rate: this.desiredSampleRate,
				channels: 1,
				encoding: 'signed-integer',
				endian: 'little',
				compression: 0.0,
				type: 'raw'
			}
		})
	}

	//debug function
	getAudioFilePath(){
		return this.audioFile;
	}
	getOutputFilePath(){
		return this.outputFile;
	}


	setFilePath = fileName => {
		this.audioFile = `./uploads/${fileName}`
		this.outputFile = `${this.main.config.savePath}${fileName.replace(/\.[^.]*$/, '.txt')}`
		return true;
	}

	checkAudioFileExists(){
		return Fs.existsSync(this.audioFile) ?  this.checkResultFileExists() : false;
	}

	checkResultFileExists(){
		//do checking
		// return Fs.existsSync(this.outputFile) ? console.log('Result already exist') : true;
		
		//NOTE: always generate new result
		return true;
	}

	readFile(){
		this.buffer = Fs.readFileSync(this.audioFile);
		this.result = Wav.decode(this.buffer);
		return this.checkSampleRate();
	}

	checkSampleRate(){
		return (this.result.sampleRate < this.desiredSampleRate) ? console.error('Warning: original sample rate (' + this.result.sampleRate + ') is lower than ' + this.desiredSampleRate + 'Hz. Up-sampling might produce erratic speech recognition.') : true;
	}

	bufferToStream = buffer => {
		let stream = new Duplex();
		stream.push(buffer);
		stream.push(null);
		return stream;
	}

	pipeBuffer(socketid){
		this.audioStream = new MemoryStream();
		this.bufferToStream(this.buffer).pipe(this.sox).pipe(this.audioStream);
		return this.audioStream.on('finish', () => {
			let audioBuffer = this.audioStream.toBuffer();
			
			const audioLength = (audioBuffer.length / 2) * (1 / this.desiredSampleRate);
			console.log(`[${new Date().toLocaleTimeString()}] audio length ${audioLength}s`);
			this.main.sttFinish(this.outputFile, this.model.stt(audioBuffer), socketid);
		});
	}
}