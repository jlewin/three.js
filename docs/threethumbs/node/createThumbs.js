/**
  * Generate thumbnails from fullsize Three.js screenshots
  */
var thumbs = require('threethumbs'),
    threejsInfo = require('examplefiles');

// File list
//var fileList = flatten(threejsInfo.exampleFiles).slice(0, 10).map(function(name){ 
var fileList = flatten(threejsInfo.exampleFiles).map(function(name){ 
    return [name, 80, 150, 1000]; //178
});

// Flatten and return the passed in tree structure
function flatten(data) {

    console.time('flatten');
	var flattened = [];

	for (var f in data) {
		var items = data[f];

		for (var i = 0, length = items.length; i < length; i++) {
			flattened.push(items[i]);
		}
	}
    
    console.timeEnd('flatten');
	return flattened;
}

// Call the generate function on the threethumbs module to create a set of 
// thumbnails for each item defined in the fileList
thumbs.generate(fileList, function(err, results) {

    if(err) {
    
        console.log('The following unexpected error occurred: ' + err);
        
    } else {
    
        // Format the results for easier viewing in the console
        var output = {};
        results.forEach(function(result) {

            // Handle condition where expected file was not produced, has been deleted, etc
            if (result == null) return;

            var name = result[0];
            
            // Extract or create object for image size
            var obj = output[name] || [];
            
            var item = [result[1] + 'px', result[2]];
            
            if(result[3]){
                item.push(result[3]);
            }
            
            // Set results
            obj.push(item);
            
            // Store
            output[name] = obj;
        
        });
    
        // For now, simply dump the results to the console
        console.log('\n\nThumb generation results: \n', output);
    
    }

});