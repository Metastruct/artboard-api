const gfycatc = require('gfycat-sdk')

const printer = require('./mods/imagePrinter.js')
const web = require('./mods/web.js')
const utils = require('./mods/utils.js')

let app = {}

app.imagePrinter = new printer(app)
app.web = new web(app)
app.utils = new utils(app)

app.gfycat = new gfycatc({
	clientId: process.env.client_id,
	clientSecret: process.env.client_secret
});

(async function() {
	app.gfycat.authenticate()
})()
