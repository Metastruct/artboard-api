const canvas = require('canvas')
const convert = require('color-convert')
const fs = require('fs')
const gm = require('gm')

var reA = /[^a-zA-Z]/g;
var reN = /[^0-9]/g;

function sortAlphaNum(a, b) {
	var aA = a.replace(reA, "");
	var bA = b.replace(reA, "");

	if (aA === bA) {
		var aN = parseInt(a.replace(reN, ""), 10);
		var bN = parseInt(b.replace(reN, ""), 10);

		return aN === bN ? 0 : aN > bN ? 1 : -1;
	} else {
		return aA > bA ? 1 : -1;
	}
}

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

	async mergeGIFFramesAndClean(norem) {
		let match = this.app.utils.findMatchesInArray(fs.readdirSync('gifframes'), "frame?").sort(sortAlphaNum)

		let img = gm();
		img.delay(100);
	
		for(let v of match) {
			img.in('gifframes/' + v)
		}
	
		await new Promise((res, rej) => { 
			img.write("pixels.gif", (err) => {
				if(err) rej(err);
				res();
			})
		})
	
		if(norem) return;

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
