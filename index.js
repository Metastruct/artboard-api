var express = require('express'),
    ipfilter = require('express-ipfilter').IpFilter,
    twitter = require("twitter");

const cs = require('canvas')
var convert = require('color-convert');

var app = express();

var bodyParser = require('body-parser')

var rawBodyHandler = function (req, res, buf, encoding) {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
        console.log('Raw body: ' + req.rawBody);
    }
}

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

function jsonParse() {
  var parse = bodyParser.json()
  return function (req, res, next) {
    req.headers['content-type'] = 'application/json'
    parse(req, res, next)
  }
}

var client = false;

var width=256,
    height=128,
    scale=0.1;

function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return "rgb(" + (r * 255).toString() + "," + (g * 255).toString() + "," + (b * 255).toString() + ")";
}

var pattern = [
	"rgb(255,255,255)",
	"rgb(0,0,0)",
];

for(i=0;i<16;i++) {
	var rgb = convert.hsv.rgb(22.5*i,100,100);
	pattern[pattern.length]="rgb(" + rgb[0].toString() + "," + rgb[1].toString() + "," + rgb[2].toString() + ")";
}

pattern[pattern.length]="rgb(127,127,127)";

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
