"use strict";

var userCoordinates;
var map, overlay, markers = [];
var mapData;

var styles = [{
	"elementType": "geometry",
	"stylers": [
	{ "visibility": "simplified" }
	]
},{
	"elementType": "labels",
	"stylers": [
	{ "visibility": "off" }
	]
},{
	"featureType": "water",
	"stylers": [
	{ "color": "#5d6e74" }
	]
},{
	"featureType": "transit",
	"stylers": [
	{ "visibility": "off" }
	]
},{
	"featureType": "poi",
	"stylers": [
	{ "visibility": "off" }
	]
},{
	"featureType": "landscape",
	"stylers": [
	{ "color": "#575757" }
	]
},{
	"featureType": "road",
	"stylers": [
	{ "weight": 0.3 },
	{ "color": "#a0a0a0" }
	]
}];

function userMap() {

	$.ajax({
		url: '/json/',
		success: function(data) {
			drawMap('map',data);

		}
	});

}

function friendMap(access_token) {

	var userCheckinsURL = "https://api.foursquare.com/v2/users/self/checkins" +
		"?oauth_token=" + access_token +
		"&limit=1"+
		"&v=20130424";

	var checkinsRecentURL = "https://api.foursquare.com/v2/checkins/recent"+
		"?oauth_token=" + access_token +
		"&limit=100"+		
		"&afterTimestamp=" + Math.round((Date.now() / 1000) - (36 * 60 * 60) ) +
		"&v=20130424";			

	console.log(checkinsRecentURL);

	$.ajax({
		url: userCheckinsURL,
		success: function(data) {

			userCoordinates = new google.maps.LatLng(
				data.response.checkins.items[0].venue.location.lat,
				data.response.checkins.items[0].venue.location.lng);

			$.ajax({
				url: checkinsRecentURL,
				success: function(data) {
					drawMap('map',data.response.recent);

								console.log(data);

				}
			});

		}
	});

}

function drawMap(element, data) {

	mapData = data;


	// Map Center
	/////////////

	var mapBounds, mapCenter;

	if (!userCoordinates) {

		mapBounds = new google.maps.LatLngBounds(
			new google.maps.LatLng(40.881989,-74.047852),
			new google.maps.LatLng(40.682949, -73.906693)
		);

		mapCenter = new google.maps.LatLng(40.72944585471527,-73.99366021156311);

	} else {

		var mapBounds = new google.maps.LatLngBounds();
		$(data).each(function(index,value) {
			var coordinates = new google.maps.LatLng(value.venue.location.lat, value.venue.location.lng);

			var distance = google.maps.geometry.spherical.computeDistanceBetween(coordinates, userCoordinates);
			if (distance < 10000 && value.user.relationship != "self") {
				mapBounds.extend(coordinates);
			}

		});

		mapCenter = mapBounds.getCenter();
	}

	// Google Maps Setup
	////////////////////

	var mapOptions = {
		streetViewControl: false,
		zoomControl: false,
		mapTypeControl: false,
		panControl: false,
		zoom: 12,
		maxZoom: 18,
		minZoom: 1,
		center: mapCenter
	};
	map = new google.maps.Map(document.getElementById('map'),mapOptions);	

	var styledMap = new google.maps.StyledMapType(styles,{name: "Styled Map"});
 	map.mapTypes.set('map_style', styledMap);
  	map.setMapTypeId('map_style');

	overlay = new google.maps.OverlayView();
	overlay.draw = function() {};
	overlay.setMap(map);  	

	google.maps.event.addListener(map, 'zoom_changed', function() {
		clearPoints();
	}); 

	// google.maps.event.addListener(map, 'dragstart', function() {
	// 	clearPoints();
	// }); 

	google.maps.event.addListener(map, 'idle', function() {
		//console.log("New bounds.")	
		clearPoints();	
		drawPoints(data);

	});  	

}

function clearPoints() {

    for (var i in markers) {
      markers[i].setMap(null);
    }

}

function drawPoints(data) {

	// Google Maps Sites
	////////////////////
	
	var siteCircle = {
	    path: google.maps.SymbolPath.CIRCLE,
	    fillOpacity: 1.0,
	    fillColor: "#F6B83C",
	    strokeWeight: 0.0,
	    scale: 5.0
	};

	var userCircle = {
	    path: google.maps.SymbolPath.CIRCLE,
	    fillOpacity: 1.0,
	    fillColor: "#17B1F3",
	    strokeWeight: 0.0,
	    scale: 5.0
	};

	var pixels = [];

	$(data).each(function(index,value) {	

		var isUser = false;
		var marker = siteCircle;

		if (!value.user || (value.user && value.user.relationship != "self")) {
			isUser = false;
			marker = siteCircle;
		} else {
			isUser = true;
			marker = userCircle;
		}


		var location = (value.venue) ?
			value.venue.location :
			{lat: value.location_lat, lng: value.location_lng};

		var coordinates = new google.maps.LatLng(location.lat, location.lng);

		if (map.getBounds().contains(coordinates)) {
			var newCircle = new google.maps.Marker({
			        icon: marker,
			        position: coordinates,
			        index : index
		    });
		    newCircle.setMap(map);
		    markers.push(newCircle);

			google.maps.event.addListener(newCircle, 'click', function() {
				showPoint(newCircle);
			});				    

			if (!isUser) {
				var pixel = overlay.getProjection().fromLatLngToContainerPixel(coordinates);
				pixels.push(pixel);
			}
		}

	});

	// Voronoi
	//////////

	var boundingBox = {xl:0,xr:$('#map').width(),yt:0,yb:$('#map').height()};	
	var voronoi = new Voronoi();
	var diagram = voronoi.compute(pixels, boundingBox);

	// Nodes
	////////

	var nodeCircle = {
	    path: google.maps.SymbolPath.CIRCLE,
	    fillOpacity: 1.0,
	    fillColor: "#B1F317",
	    strokeWeight: 0.0,
	    scale: 5.0
	};	

	$(diagram.vertices).each(function(index,value) {	


		if (value.x != 0 && value.x != $('#map').width() && value.y != 0 && value.y != $('#map').height()) {

			var currentLocation = 	overlay.getProjection().fromContainerPixelToLatLng(value);

			var newCircle = new google.maps.Marker({
			        icon: nodeCircle,
			        position: currentLocation
		    });
		    newCircle.setMap(map);
		    markers.push(newCircle);

			google.maps.event.addListener(newCircle, 'click', function() {
				showPoint(newCircle);
			});		    

		}

	});


	// Edges 
	////////

	$(diagram.edges).each( function (index, value) {

		//console.log(value);

		var startLocation = overlay.getProjection().fromContainerPixelToLatLng(value.va);
		var endLocation = overlay.getProjection().fromContainerPixelToLatLng(value.vb);

		var lineCoordinates = [
    		startLocation,
    		endLocation
  		];

		var edge = new google.maps.Polyline({
			path: lineCoordinates,
			strokeColor: "#99CCFF",
			strokeOpacity: 1.0,
			strokeWeight: 1
		});

		edge.setMap(map); 
		markers.push(edge); 		


	});	

}

function showPoint(marker) {

	var markerData = mapData[marker.index];

	if (markerData && markerData.venue) {

		

		var date = new Date(markerData.createdAt*1000);

		var infoTime = (date.toLocaleString());
		var infoName = (markerData.user.firstName + " " + markerData.user.lastName);
		var infoUserImage = markerData.user.photo.prefix + "100x100" + markerData.user.photo.suffix;
		var infoVenu = (markerData.venue.name);
		var infoCoordinates = (markerData.venue.location.lat + ", " + markerData.venue.location.lng);
		var infoAddressOne = (markerData.venue.location.address);
		var infoAddressTwo = (markerData.venue.location.city + ", " + markerData.venue.location.state );

		$("#information").html("");

		$("#information")

			.append($("<hr/>").css('clear', 'both'))

			.append($("<img/>")
				.css('float', 'left')
				.css('margin-right', 8)
				.attr({'src': infoUserImage, width: 100, height: 100}))

			.append($("<label/>").text("Who"))
			.append($("<span/>").text(infoName))

			.append($("<label/>").text("When"))
			.append($("<span/>").text(infoTime))

			.append($("<br/>"))
			.append($("<hr/>").css('clear', 'both'))

			.append($("<label/>").text("Where"))
			.append($("<span/>").text(infoVenu))			

			.append($("<label/>").text("Address"))
			.append($("<span/>").text(infoAddressOne))
			.append($("<span/>").text(infoAddressTwo))

			.append($("<label/>").text("Coordinates"))
			.append(
				$("<span/>").append(
					$("<a/>")
						.attr('href',"//maps.google.com" +
							"?q=" + marker.position.lat() + "," + marker.position.lng())
						.text(infoCoordinates)
				)
			);		

	} else {

		var infoCoordinates = (marker.position.lat() + ", " + marker.position.lng());

		$("#information").html("");
		$("#information")


			.append($("<hr/>").css('clear', 'both'))


			.append($("<img/>")
				.attr('src', "//maps.googleapis.com/maps/api/streetview" +
					"?size=256x120" +
					"&location=" + marker.position.lat() + "," + marker.position.lng() + 
					"&fov=120&sensor=false")
				.attr({width: 256, height: 120}))

			.append($("<label/>").text("Coordinates"))
			.append(
				$("<span/>").append(
					$("<a/>")
						.attr('href',"//maps.google.com" +
							"?q=" + marker.position.lat() + "," + marker.position.lng())
						.text(infoCoordinates)
				)
			);	



	}

	// Lookup Data

	// var url = "//maps.googleapis.com/maps/api/geocode/json" +
	// "?latlng=" + location.latitude + "," + location.longitude + 
	// "&sensor=false"
	// $.ajax({ url: url, success: function(data) {

	// 	var html = (data.results[0].formatted_address).replace(",","<br/>");
	// 	$("#informationAddress").html(html);
	// }})

}