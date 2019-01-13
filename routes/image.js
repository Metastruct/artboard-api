const express = require('express')

module.exports = function(app) {
    let router = express.Router()

    router.get('/image/create', (req, res) => {
        if(!req.body.img) return res.status(400).send("req.body.img missing");
        const data = JSON.parse(req.body.img);

        let stream = app.imagePrinter.makeImage(data)

        stream.pipe(res);

        res.set({
            'Content-Type': 'image/png',
        });
  
    })

    return router
}
