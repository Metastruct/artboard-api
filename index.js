const printer = require('./mods/imagePrinter.js')
const web = require('./mods/web.js')
const utils = require('./mods/utils.js')

let app = {}

app.imagePrinter = new printer(app)
app.web = new web(app)
app.utils = new utils(app)