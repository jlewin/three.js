var find = require('findit');
var path = require('path');
var fs = require('fs')

var timerName = 'Elapsed Time';

// Start timer
console.time(timerName);

// Add some spacing after command line
console.log();

// Store startup path
var startupPath = process.cwd();

// Set working dir
process.chdir('../../');

// Start path iteration
var finder = find('.');

// Paths to ignore
var filters = ['build', 'docs', '.git'];
var filterCount = filters.length;               
               
var limit = -1;
var processed = 0;

// At this point allResults is only used for debugging and 
var allResults = [];

var files = [];

function TokenMapper() { };

TokenMapper.prototype.add = function(key, val) {
    if(!(key in this)) {
        this[key] = [];
    }
    
    this[key].push(val);
};

var tokenMap = new TokenMapper();

finder.on('file', function (file, stat) {

    var ext = path.extname(file).toLowerCase();
    if(ext === '.js' || ext === '.html') {
    
        if(limit > 0 && processed++ >= limit) return;
        
        var formattedPath = file.replace(/\\/g, '/');
        
        files.push(formattedPath);
        var fileIndex = files.length - 1;

        readFile(file, function(text){
        
            allResults.push({ 
                file: formattedPath,
                index: fileIndex,
                results: extractReferences(text, fileIndex)
            });
        
        });
        
    }
});

finder.on('directory', function (dir, stat, stop) {

    // Test each filter for a match - exit if found
    for(var i = 0; i < filterCount; i++) {
    
        if(dir.indexOf(filters[i]) == 0) {
            console.log(' - Skipping Path: ' + path.resolve(dir) + path.sep + '*');
            stop();
            return;
        }
    }
    
});

// Read file contents
function readFile(filePath, completed) {

    fs.readFile(filePath, 'utf8', function (err,data) {
        process.stdout.write(".");

        if (err) {
            return console.log(err);
        }

        completed(data);
    });
}

var re = /(\.call|\.prototype|\.apply)/g;
var typeMatch = /THREE\.[\w\.]+/g;
    
function extractReferences(text, fileIndex) {

    // Hash to dedupe
    var results = {}; 
    
    // Match THREE.xxx * [^ \s or ( or $]
    var matched = text.match(typeMatch);
    
    var arr = [];
    
    if(matched && matched.length) {
        matched.forEach(function(s){
          // Drop proto, call, apply, etc
          results[s.replace(re, '')] = null;
        });
    }
    
    // Iterate deduped items and push to token map
    for( var v in results ) {
        arr.push(v);
        
        tokenMap.add(v, fileIndex);
        
    }
    
    return arr;

}

function writeFile(filePath, data, callback) {

    fs.writeFile(filePath, data, function(err) {
        
        if(err) {
            console.log('Error saving ' + path.resolve(filePath) + ': ' + err);
        } else {
            console.log('File Updated: ' + path.resolve(filePath));
        }
        
        if(callback) {
            callback();
        }
    }); 

}

finder.on('end', function () {

    console.log('\r\n');

    // Restore working directory to startup path, then output results
    process.chdir(startupPath);
    
    writeFile('dbgresults.js', JSON.stringify(allResults));
        
        
    writeFile('tokenmap.js', 'var tokenMap = ' + JSON.stringify({tokenMap: tokenMap, files: files}) + ';', function() {
        
        console.timeEnd(timerName);
    }); 
    
});
