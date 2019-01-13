const express = require('express')
const fs = require('fs')
const bodyparser = require('body-parser')

module.exports = class Web {
    constructor(app) {
        this.app = app;
        this.web = express();

        let opts = {
            limit: '64mb',
            parameterLimit: 10000,
            extended: true
        }
        
        this.web.use(bodyparser.json(opts))
        this.web.use(bodyparser.urlencoded(opts))
        
        this.loadRouters()

        this.web.listen(10010)
    }

    loadRouters() {
        for(let route of fs.readdirSync('routes')) {
            this.web.use(require('../routes/' + route)(this.app))
        }
    }
}
