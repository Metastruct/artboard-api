const canvas = require('canvas')
const convert = require('color-convert')
const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const fs = require('fs')

module.exports = class ImagePrinter {
    constructor(app) {
        this.app = app

        this.pattern = [
            "rgb(255, 255, 255)",
            "rgb(0, 0, 0)"
        ]

        let divised = 360 / 16

        for(let i = 0; i < 16; i++) {
            let color = this.RGBarrayToString(convert.hsv.rgb(divised * i, 100, 100));
            this.pattern.push(color)
        }

        this.pattern.push('rgb(127, 127, 127)')
        
        this.width = 256 / .1
        this.height = 128 / .1
    }

    RGBarrayToString(array) {
        return "rgb(" + array[0] + ", " + array[1] + ", " + array[2];
    }

    async mergeGIFFramesAndClean() {
        let gif = new GIFEncoder(this.width, this.height)
        let opts = {delay: 500, quality: 10, repeat: 0}

        const stream = pngFileStream('gifframes/frame?.png')
            .pipe(gif.createWriteStream(opts))
            .pipe(fs.createWriteStream('pixels.gif'))

        await new Promise((res, rej) => {
            stream.on('finish', res)
            stream.on('error', rej)
        })

        let match = this.app.utils.findMatchesInArray(fs.readdirSync('gifframes'), "frame?")
        
        for(let v of match) {
            fs.unlinkSync('gifframes/' + v)
        }
    }

    makeImage(data) {
        const cnv = new canvas.Canvas(this.width, this.height)
        const ctx = cnv.getContext('2d')
	
	    ctx.fillStyle = "#FFF";
	    ctx.fillRect(0, 0, this.width, this.height);
        
	    data.forEach((x) => {
	    	ctx.fillStyle = this.pattern[x.color];
	    	ctx.fillRect(Math.floor(x.x * 16), Math.floor(x.y * 16), 16, 16);
        });
        
        return cnv.createPNGStream();
    }
}
