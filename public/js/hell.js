var dimensions = {width: 400, height: 745};
var bounds = {n:40.682949,w:-74.047852,s:40.881989,e:-73.906693};
var nodes =  [];
var sites = [];
var radius = 5;

function drawMap(element, data) {

	// Raphael Setup
	////////////////

	var draw = SVG(element).size(400, 745);
	var image = draw.image('//s3.amazonaws.com/hellisotherpeople/map.jpg', 400, 745)

	var voronoi = new Voronoi();
	var bbox = {xl:0,xr:dimensions.width,yt:0,yb:dimensions.height};

	$(data).each(function(index,value) {	

		var location = {latitude: value.location_lat, longitude: value.location_lng}
		var point = locationToPoint( location, bounds, dimensions);

		sites.push(point);

	});


	// Calculate Voronoi
	////////////////////

	var diagram = voronoi.compute(sites, bbox);

	// Draw Edges
	/////////////

	nodes = diagram.vertices;

	$(diagram.edges).each( function (index, value) {

		var line = draw.line(value.va.x, value.va.y, value.vb.x, value.vb.y)
						.stroke({ color: '#99CCFF', width: 1.5 })		    

	});

	// Draw Sites
	/////////////

	$(sites).each( function(index, value){

		draw.circle(10)
			.center(value.x , value.y)
			.fill({color:"#F6B83C"})
			.style('cursor', 'pointer')
			.data("index",index)
			.click(function() {
					showPoint(sites[this.data('index')]);
			})

	});

	// Draw Nodes
	/////////////

	$(nodes).each( function(index, value){

		if (value.x != 0 && value.x != dimensions.width && value.y != 0 && value.y != dimensions.height) {

			draw.circle(10)
				.center(value.x , value.y)
				.fill({color:"#B1F317"})
				.style('cursor', 'pointer')
				.data("index",index)
				.click(function() {
						showPoint(nodes[this.data('index')]);
				})


		}

	});	

}




function showPoint(point) {

	var location = pointToLocation(point, bounds, dimensions);
	
	$("#informationTitle").text("Point Information");
	$("#informationImage")
		.attr('src', "//maps.googleapis.com/maps/api/streetview" +
			"?size=308x120" +
			"&location=" + location.latitude + "," + location.longitude + 
			"&fov=120&sensor=false")
		.attr({width: 308, height: 120});
	$("#informationLink")
		.attr('href', "//maps.google.com/?q=" + location.latitude + "," + location.longitude);
	$("#informationLatitude").text(location.latitude);
	$("#informationLongitude").text(location.longitude);
	$("#informationAddress").text("");
	$("#information").fadeIn('slow');

	// Lookup Data

	var url = "//maps.googleapis.com/maps/api/geocode/json" +
		"?latlng=" + location.latitude + "," + location.longitude + 
		"&sensor=false"
	$.ajax({ url: url, success: function(data) {

		var html = (data.results[0].formatted_address).replace(",","<br/>");
		$("#informationAddress").html(html);
	}})

}

function locationToPoint (location, bounds, dimensions) {

	var pixelsPerLat = dimensions.height/(bounds.n-bounds.s);
	var pixelsPerLong = dimensions.width/(bounds.e-bounds.w);

	var x = (location.longitude-bounds.w)*pixelsPerLong;
	var y = dimensions.height + (location.latitude-bounds.n)*pixelsPerLat;

	return {x: x, y: y}
}

function pointToLocation(point, bounds, dimensions) {

	var latPerPixel = (bounds.n-bounds.s) / dimensions.height;
	var longPerPixel = (bounds.e-bounds.w) / dimensions.width;

	var longitude = (point.x * longPerPixel) + bounds.w;
	var latitude = ((point.y - dimensions.height) * latPerPixel) + bounds.n;

	return {latitude: latitude, longitude: longitude};

}