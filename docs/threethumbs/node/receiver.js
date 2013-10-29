var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    /* easyimg = require('easyimage'), */
    inspect = require('util').inspect,
    Busboy = require('busboy');

//var JSON.stringify(new Date()).replace(/:/g, '-').replace(/\"/g, '').substring(0, 19)

var port = 8000;

http.createServer(function (req, res) {
	if (req.method === 'POST') {

		var infiles = 0,
			outfiles = 0,
			busboy = new Busboy({ headers: req.headers });

		console.log('\r\n -----[ Inbound Post ]----- ');

		busboy.on('field', function (fieldname, value, valueTruncated, fieldnameTruncated) {

			// The value variable starts with leading MIME header information. When we make the call to the
			// base64 decode function, we need to strip off the leading meta data
			var buffer = new Buffer(value.substr(22), 'base64');

			onFile(buffer, req.headers['tjs-name'], function () {




					console.log('All parts written to disk');
					res.writeHead(200, { 'Connection': 'close' });
					res.end("That's all folks!");
			});

		});


		busboy.once('end', function () {
			console.log('Done parsing form!');
		});

		req.pipe(busboy);

	} else if (req.method === 'GET') {
		res.writeHead(200, { Connection: 'close' });
		res.end('<html><head></head><body>\
               Listening on' + port + '\
            </body>');
	}
}).listen(port, function () {
	console.log('Listening for requests -  Port:' + port);
});

var re = /[\.\\\/]+/g;

function onFile(data, filename, next) {

	var file = [__dirname, '../../generated', filename.replace(re, '') + '.jpg'].join(path.sep);
	console.log('Write to file: ' + file);

	//var fstream = fs.createWriteStream(path.join(os.tmpDir(), path.basename(filename)));
	var fstream = fs.createWriteStream(file);

	fstream.once('close', function () {
		console.log(filename + ' written to disk');
		next();
	});

	console.log('(' + filename + ') start saving');

	//fstream.write(data);
	fstream.end(data);

}

/*

function resize(filename, options) {

  easyimg.resize({
  	src: filename, dst:  'kitten-thumbnail.jpg',
  	width: 500, height: 500,
  	cropwidth: 128, cropheight: 128,
  	x: 0, y: 0
  },
  function (err, image) {
  	if (err) throw err;
  	console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
  }
);

}

*/