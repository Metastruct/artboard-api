var express = require('express');

const cs = require('canvas')
var convert = require('color-convert');

var app = express();

var bodyParser = require('body-parser')

//app.use(bodyParser.json({ verify: rawBodyHandler }));
app.use(bodyParser.json({     // to support URL-encoded bodies
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}));
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}));
//app.use(bodyParser());

var width=256,
    height=128,
    scale=0.1;

var pattern = [
	"rgb(255,255,255)",
	"rgb(0,0,0)",
];

for(i=0;i<16;i++) {
	var rgb = convert.hsv.rgb(22.5*i,100,100);
	pattern.push("rgb(" + rgb[0].toString() + "," + rgb[1].toString() + "," + rgb[2].toString() + ")")
}

pattern.push("rgb(127,127,127)");

app.post("/draw",function(req,res) {
	if(!req.body.img) return res.status(403).send("req.body.img missing");
	
	const canvas = new cs(width/scale,height/scale)
	const ctx = canvas.getContext('2d')
	
	const egg = JSON.parse(req.body.img);
	
	ctx.fillStyle="#FFF";
	ctx.fillRect(0,0,width/scale,height/scale);
	
	egg.forEach((x)=> {
		ctx.fillStyle=pattern[x.color];
		ctx.fillRect(Math.floor(x.x*16),Math.floor(x.y*16),16,16);
	});
	
	const stream = canvas.createJPEGStream()
	stream.pipe(res)
	
	res.set({
  		'Content-Type': 'image/jpeg',
	});
});

app.listen(10010);
