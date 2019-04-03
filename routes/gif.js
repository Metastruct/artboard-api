const express = require('express')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

let APIKEY = "fBmKzfPXsoXPH1Os";

function check(req, res, next) {
	let auth = req.get('Authorization')
	auth = (auth == undefined ? "" : auth)
	auth = auth.split(" ")
	
	if(!(auth[0] == "Bearer" && auth[1] == APIKEY)) {
		return res.status(403).send("Access denied.")
	}

	next();
}

module.exports = function(app) {
	let router = express.Router()

	router.post('/gif/append', check, (req, res) => {
		if(!req.body.img) return res.status(400).send("req.body.img missing");
		const data = JSON.parse(req.body.img);

		let stream = app.imagePrinter.makeImage(data)
		let name = moment().format('MM-DD-YY')
		
		console.log('creating/overwriting a frame "' + name + '"')
		
		stream.pipe(fs.createWriteStream('gifframes/frame_' + name + '.png'))

		res.send({success: true})
	})

	router.get('/gif/create', check, async (req, resf) => {
		await app.imagePrinter.mergeGIFFramesAndClean();
		
		console.log('creating a gif')
	
		let id = null;
		await new Promise((res, rej) => {
			let opts = { fetchUrl: 'http://' + process.env.host + ':10010/gif/tops', title: 'Meta Construct Pixels Result - ' + moment().format('MM.DD.YYYY') }
			app.gfycat.upload(opts, (err, resp) => {
				if(err) rej(err);
				
				id = resp.gfyname;
				console.log('gfycat> [' + id + '] processing pixels gif...')
				
				let interval = setInterval(function() {
					app.gfycat.checkUploadStatus(resp.gfyname, (err, rs) => {
						if(err) return;

						if(rs.task == "complete") {
							console.log('gfycat> [' + id + '] processing done.')

							res();
							clearInterval(interval);
						}
					})
				}, 2000)
			})
		})
		
		resf.send({id: id})
	})

	router.get('/gif/tops', function(req, res) {
		res.sendFile(path.join(__dirname, '../', 'pixels.gif'));
	})

	return router
}
