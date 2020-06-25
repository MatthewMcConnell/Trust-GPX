/* >>>> GLOBAL VARIABLES <<<< */
var gpxData; // xmlDoc variable that the gpx file is loaded into, can be used from any function
var map; // map variable to add to
var coords; // List of coordinates (only coordinates)

// Dictionary of ILayers for leaflet  
var layers = Object();

// List of dictionaries with information about route excluding coords
// The dictionaries with route data is in the same order as coords
var route_data;

/* >>>> ON PAGE INITIALIZATION <<<< */
$(document).ready(function () {

    map = defaultDrawMap();

    map.locate({
        setView: true,
        maxZoom: 5
    });

    $("#gpxUploadBtn").change(function () {
        loadGPX();
    });

    $('#hr-switch').click(function () {
        if ($(this).is(':checked')) {
            visualiseBPM();
        } else {
            map.removeLayer(layers["hr"]); // hide hr visualisation
        }
    });

    $('#ele-switch').click(function () {
        if ($(this).is(':checked')) {
            map.removeLayer(layers["routeLine"]);
            visualiseElevation();
        } else {
            map.removeLayer(layers["ele"]); // hide ele visualisation
            if (!map.hasLayer(layers["speed"])) {
                map.addLayer(layers["routeLine"]);
            }
            if (map.hasLayer(layers["cad"])) { // if cad exists show cad on top
                map.removeLayer(layers["cad"]);
                map.addLayer(layers["cad"]);
            }
        }
    });

    $('#cad-switch').click(function () {
        if ($(this).is(':checked')) {
            visualiseCad();
        } else {
            map.removeLayer(layers["cad"]); // hide cad visualisation
        }
    });
});
/* >>>> END ON PAGE INITIALIZATION <<<< */

/* >>>> ON FILE UPLOAD <<<< */
function loadGPX() {
    var upload, file, fr;

    upload = $("#gpxUploadBtn")[0]

    if (typeof window.FileReader !== 'function') {
        alert("The file API isn't supported on this browser yet.");
        return;
    }

    if (!upload) {
        alert("Um, couldn't find the fileinput element.");
    } else if (!upload.files) {
        alert("This browser doesn't seem to support the `files` property of file inputs.");
    } else if (!upload.files[0]) {
        alert("Please select a file before clicking 'Load'");
    } else {
        fileTypes = ['gpx']; //all supported filetypes

        file = upload.files[0];
        var extension = file.name.split('.').pop().toLowerCase(),
            isSuccess = fileTypes.indexOf(extension) > -1;
        if (isSuccess){
            fr = new FileReader();
            fr.onload = receivedText;
            fr.readAsText(file);
        } else{
            alert("The file you selected was not a .GPX file.\nPlease select a .GPX file.");
        }
        
    }

    function receivedText() {
        gpxData = new DOMParser().parseFromString(fr.result, "text/xml");

        if (gpxData.getElementsByTagName("parsererror").length > 0)
        {
            alert("The file you uploaded was not a valid gpx-xml file.\nWe can not read and visualise this file.");
        }
        else
        {
            getTitle();
            getRouteData(); // generate new coords and route_data
            drawRoute(coords, "#8766c4", map);
            displaySummary();   
        }
    }
}
/* >>>> END ON FILE UPLOAD <<<< */

/* >>>> HELPER FUNCTIONS <<<< */
/* SUMMARY: Find title of GPX file */
function getTitle() {
    var names = gpxData.getElementsByTagName("name");
    console.log(names[0].childNodes[0].nodeValue)
}

function reset_checkboxes() {
    var labels = ["ele", "cad", "hr"];
    for (label in labels) {
        document.getElementById(labels[label] + "-switch").disabled = false;
        document.getElementById(labels[label] + "-switch").checked = false;
        document.getElementById(labels[label] + "-label").style.backgroundColor = "#ffffff";
        document.getElementById(labels[label] + "-label").style.textDecoration = "none";
    }

}

/* SUMMARY: Extracts data about the route from a GPX file 
 * Returns Assigns data to global route_data or null if invalid
 */
function getRouteData() {
    /* RESET */
    // RESET: Removing all the layers we added to the map (visualisations and route)
    for (i in layers) {
        map.removeLayer(layers[i]);
    };

    // Create a new dictionary to have visualisation layers loaded into
    layers = new Object();

    reset_checkboxes();

    route_data = [];
    coords = [];
    var points = gpxData.getElementsByTagName("trkpt");

    var is_ele = true;
    var is_time = true;
    var is_hr = true;
    var is_cad = true;

    var to_alert = [];

    document.getElementById("error-msg").innerHTML = "";
    /* END RESET */

    for (i = 0; i < points.length; i++) {
        // Add coords
        try {
            coords.push([points[i].getAttribute("lat"), points[i].getAttribute("lon")]);
        } catch {
            return;
        }


        // Create dictionary of additional data
        var new_dict = Object();

        // Add elevation and time
        // Check if elevation is present
        if (is_ele) {
            try {
                new_dict["ele"] = points[i].getElementsByTagName("ele")[0].childNodes[0].nodeValue;
            } catch (err) {
                is_ele = false
                document.getElementById("ele-switch").disabled = true;
                document.getElementById("ele-label").style.backgroundColor = "#d9d9d9";
                document.getElementById("ele-label").style.textDecoration = "line-through";

                to_alert.push("No elevation data found.\n");
            }
        }
        
        // Check if time is present
        if (is_time) {
            try {
                new_dict["time"] = points[i].getElementsByTagName("time")[0].childNodes[0].nodeValue;
            } catch (err) {
                is_time = false;

                to_alert.push("No time data found.\n");
            }
        }

        // Add heart rate and cadence
        // Check if heartrate is present
        if (is_hr) {
            try {
                new_dict["hr"] = points[i].getElementsByTagNameNS("*", "hr")[0]
                    .childNodes[0]
                    .nodeValue;
            } catch (err) {
                is_hr = false;
                document.getElementById("hr-switch").disabled = true;
                document.getElementById("hr-label").style.backgroundColor = "#d9d9d9";
                document.getElementById("hr-label").style.textDecoration = "line-through";
                to_alert.push("No heart rate data found.\n");
            }
        }

        // Check if cadence is present
        if (is_cad) {
            try {
                new_dict["cad"] = points[i].getElementsByTagNameNS("*", "cad")[0]
                    .childNodes[0]
                    .nodeValue;
            } catch (err) {
                is_cad = false;
                document.getElementById("cad-switch").disabled = true;
                document.getElementById("cad-label").style.backgroundColor = "#d9d9d9";
                document.getElementById("cad-label").style.textDecoration = "line-through";
                to_alert.push("No cadence data found.\n");
            }
        }
        // Add the additional data to a list
        route_data.push(new_dict);

    }

    if (to_alert.length != 0) {
        alert(to_alert.join("") + "Functions using the above parameters has been disabled.");
    }
}

/* >>>> END HELPER FUNCTIONS <<<< */


/* SUMMARY: Draws a map looking at Glasgow, Default to be used before changing the view */
function defaultDrawMap() {
    var mymap = L.map('mapid').setView([55.8642, -4.2518], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoibXVzaWNhbHNwZWFybWFuIiwiYSI6ImNqbjY0Mm54ODE1d28zdnJ1Mm9uNWl2aTUifQ.-DEEL0HuruKcquwLNIhgKQ'
    }).addTo(mymap);
    
     /* Generates a minimap at the bottom right of the main map */
	L.control.social({default_text: "Guess where I am"}).addTo(mymap);

    var options = {     
        marker:'#000000',
        topojsonSrc: 'static/js/world.json'
    };

    new L.Control.GlobeMiniMap(options).addTo(mymap);
	
    return mymap;
}


/*  SUMMARY: Produces a Popup

    LatLng - the array of a singular coordinate of where the popup should be drawn
    Content - The string content to be shown in the pop up
    Map - the map to draw it on
     */
function drawPopup(latlng, content) {
    L.popup()
        .setLatLng(latlng)
        .setContent(content)
        .openOn(map)
}

/*  SUMMARY: Draws the route in your colour

    coords - an array of points to draw the route from
    color - colour of the route
    map - map to draw the route onto
    */
function drawRoute(coords, color) {
    var routeLine = L.polyline(coords, {
        color: color,
        weight: 7
    });

    layers["routeLine"] = new L.LayerGroup();
    layers["routeLine"].addLayer(routeLine);
    layers["routeLine"].addTo(map);
    map.fitBounds(routeLine.getBounds());
}


/* >>>> Heartrate Visualisation <<<< */
function visualiseBPM() {
    if (layers.hasOwnProperty("hr")) {
        map.addLayer(layers["hr"]); // show hr visualisation
        return;
    }

    /* Step through coordinates and get associated BPM */
    var step = Math.round(Math.sqrt(coords.length));

    [min, max] = minMaxBPM();
    [levels, levelsInfo] = getBpmLevels();
    for (var i = 0; i < coords.length; i += step) {
        try {
            var lat = coords[i][0];
            var long = coords[i][1];
            var heartrate = parseInt(route_data[i]["hr"]);
            closestLevel = matchLevel(levels, heartrate); //Level is a measure of how intensive the exercise is
            heartNo = getHeartNo(min, max, heartrate);
            addMarker(heartNo, lat, long, heartrate, levelsInfo[levels.indexOf(closestLevel)]);
        } catch {
            return;
        }
    }
    layers["hr"].addTo(map);
}

/* SUMMARY: Calculates appropriate heart icon to use 
 * Takes max and min as upper and lower limit to find a
 * 'percentage full' within those limits
 */
function getHeartNo(min, max, heartrate) {
    var ratio = (heartrate - min) / (max - min);

    var closest = 1;
    var closestProximity = Infinity;
    for (var perc = 0; perc <= 1; perc += 0.25) {
        var proximity = Math.abs(perc - ratio);
        if (proximity < closestProximity) {
            closestProximity = proximity;
            closest = perc;

        }
    }
    return Math.round((closest / 0.25).toPrecision(2)) + 1;
}

/* SUMMARY: Finds lowest and highest heartrate along entire route */
function minMaxBPM() {
    var min = Infinity;
    var max = 0;
    for (var i = 0; i < coords.length; i++) {
        var heartrate = parseInt(route_data[i]["hr"]);
        if (heartrate < min) {
            min = heartrate;
        }
        if (heartrate > max) {
            max = heartrate;
        }
    }
    return [min, max];
}


/* SUMMARY: Gets information on exercise intensity past certain 
 * Heartrate thresholds
 * Based on Haskell Formula for Exercise Intensity, 
 * in future release will give more accurate results through 
 * Custom AGE field
*/
function getBpmLevels() {
                    //100% 90%  80%  70%  60%  50%
    HaskellFormula = [200, 180, 160, 140, 120, 100];
    messages = ["Maximum Activity", "Anaerobic Activity", "Aerobic Activity", "Optimal Activity", "Moderate Activity", "Low Activity"];
    return [HaskellFormula, messages];
}

/*  SUMMARY: Finds the closest Intensity Level for the 
 *  provided heartrate 
 */
function matchLevel(bpmLevels, heartrate) {
    if (!Number.isInteger(heartrate)) {
        return;
    }
    var levelProximity = Infinity;
    var closestLevel = bpmLevels[0];
    // Finds heartrate that is closest to entered heartrate
    for (var i = 0; i < bpmLevels.length; i++) {
        var proximity = Math.abs(bpmLevels[i] - heartrate);

        if (proximity < levelProximity) {
            levelProximity = proximity;
            closestLevel = bpmLevels[i];
        }
    }

    return closestLevel;
}


/* SUMMARY: Places marker on map at provided latitude &
 * Longitude. 
 * Additionally displays heartrate information and intensity
 * level inside a pop-up bounded to the marker
 */
function addMarker(type, lat, long, heartrate, levelInfo) {
    if (Number.isInteger(type) && Number.isInteger(heartrate))
        if (type >= 0 && type <= 5)
            iconUrl = 'static/markers/heart' + type + '.png';
        else
            return;
    else
        return;


    var HeartIcon = L.Icon.extend({
        options: {
            iconSize: [25, 34],
            iconAnchor: [11, 34],
            popupAnchor: [-3, -76]
        }
    });

    var heartIcon = new HeartIcon({
        iconUrl: iconUrl
    });

    var marker = L.marker([lat, long], {
        icon: heartIcon,
        alt: 'Heartrate Level (bpm)' + heartrate, //Accesability
    })
    marker.bindPopup("<p> <b> Heart Rate </b> <br />" + heartrate + "( " + levelInfo + " ) </p>");
    marker.on('mouseover', function (e) {
        this.openPopup();
    });
    marker.on('mouseout', function (e) {
        this.closePopup();
    });

    /* Control for Layers */
    if (layers.hasOwnProperty("hr")) {
        layers["hr"].addLayer(marker);
    } else {
        layers["hr"] = new L.LayerGroup();
    }
}
/* >>>> END HEARTRATE VISUALISATION <<<< */

/* >>>> CADENCE VISUALISATION <<<< */
function visualiseCad() {
    if (layers.hasOwnProperty("cad")) {
        map.addLayer(layers["cad"]); 
        return;
    }

    layers["cad"] = new L.LayerGroup();

    var spacing;
    var point = 1;

    if (route_data.length <= 1) {
        return;
    }

    var step = Math.round(coords.length / 100);

    var max_cad = route_data[0]["cad"];
    var min_cad = route_data[0]["cad"];

    for (var i = 0; i < coords.length; i += step) {
        var current = route_data[i]["cad"];
        if (current != null && current != 0) {
            if (current > max_cad) {
                max_cad = current;
            } 
            if (current < min_cad) {
                min_cad = current;
            }
        }
    }    

    var options = {
            "dashArray": "1 10",
            "color": "#fcd6a4",
            "weight": 4,
    };

    var min_space = 1;
    var max_space = 35;

    for (var i = 0; i < coords.length; i += step) {

        spacing =  Math.ceil(scaleCad(min_space, max_space, min_cad, max_cad, route_data[i]["cad"]));

        options["dashArray"] = String(point) + " " + String(spacing);

        var marker = L.polyline(coords.slice(i, i + step + 1), options);

        marker.bindPopup("<p> <b> Cadence </b> <br />" + route_data[i]["cad"] + " RPM / SPM <br /> <small>Rotations Per Minute for cycling <br /> Steps Per Minute for running</small> </p>");
        marker.on('mouseover', function (e) {
            this.openPopup();
        });
        marker.on('mouseout', function (e) {
            this.closePopup();
        });
        layers["cad"].addLayer(marker);
    }

    layers["cad"].addTo(map); 

}

/*  SUMMARY: Returns appropriate spacing for dots based on cadence level */
function scaleCad(min_space, max_space, min_cad, max_cad, target) {

    if (target == 0 || target == null) {
        return max_space;
    }

    space_diff = max_space - min_space;
    unit_scaled = (target - min_cad)/(max_cad - min_cad);

    return (max_space - (space_diff * unit_scaled)) + min_space;
}
/* >>>> END CADENCE VISUALISATION <<<< */

/* >>>> ELEVATION VISUALISATION <<<< */
function visualiseElevation() {
    if (layers.hasOwnProperty("ele")) {
        map.addLayer(layers["ele"]); // Show ele visualisation
        return;
    }

    layers["ele"] = new L.LayerGroup();

    var data = [];
    var min = Infinity;
    var max = 0;

    for (var i = 0; i < coords.length; i++) {
        var ele = parseInt(route_data[i]["ele"]);
        var points = coords[i];
        points.push(ele); // Add z element to control colour

        if (ele < min) {
            min = ele;
        }

        if (ele > max) {
            max = ele;
        }

        if (i - 1 >= 0 && Math.abs(ele - route_data[i - 1]["ele"]) > 1) {
            var marker = L.marker([coords[i][0], coords[i][1]], {
                icon: L.divIcon({
                    className: 'leaflet-mouse-marker',
                    iconAnchor: [20, 20],
                    iconSize: [40, 40],
                    alt:'Elevation (metres)' + ele //Accesability
                }),
                opacity: 0,
            });

            marker.bindPopup("<p> <b> Elevation </b> <br />" + ele + "m</p>");
            marker.on('mouseover', function (e) {
                this.openPopup();
            });
            marker.on('mouseout', function (e) {
                this.closePopup();
            });

            layers["ele"].addLayer(marker);
        }

        data.push(points);
    }

    options = {
        weight: 5,
        palette: { 0.0: 'blue', 0.5: 'purple', 1.0: 'red' },
        min: min,
        max: max,
    }

    var hotlineLayer = new L.Hotline(data, options);
    layers["ele"].addLayer(hotlineLayer);
    layers["ele"].addTo(map); // Show ele visualisation
}
/* >>>> END ELEVATION VISUALISATION <<<< */

/* >>>> SUMMARY PANEL <<<< */
function displaySummary() {
    var totalDist = getTotalDistance();
    if (!(route_data[0]["time"] === 'undefined')) {
        var totalTime = getTotalTime();
        document.getElementById("duration").innerHTML = "<i class='fa fa-stopwatch'></i> <b> Total Duration </b> (hours) <br> " + ((totalTime) / 3600).toFixed(2);
        document.getElementById("speed").innerHTML = "<i class='fa fa-fast-forward'></i>  <b> Average Speed </b> (km/h) <br> " + ((totalDist / 1000) / ((totalTime) / 3600)).toFixed(2);
    }
    if (!(route_data[0]["hr"] === 'undefined')) {
        var totalBPM = getTotalBPM();
        var stringOutput;

        if (totalBPM != "N/A")
        {
            stringOutput = (totalBPM/route_data.length).toFixed(2);
        }
        else
        {
            stringOutput = totalBPM;
        }

        document.getElementById("heartrate").innerHTML = "<i class='fa fa-heartbeat'></i> <b> Average Heart Rate </b>(bpm) <br> " + stringOutput;
    }

    document.getElementById("dist").innerHTML = "<i class='fa fa-ruler-horizontal'></i> <b> Total Distance Travelled </b> (km) <br> " + (totalDist / 1000).toFixed(2);
}

/* SUMMARY: Calculates total length of the Route */
function getTotalDistance() {
    var totalDist = 0;
    for (i = 0; i < coords.length; i++) {

        currentLat = coords[i][0];
        currentLong = coords[i][1];
        var currentLatLong = L.latLng(currentLat, currentLong);
        if (i > 0) { //I.e. not first coordinate
            var prevLatLong = L.latLng(coords[i - 1][0], coords[i - 1][1]);
            totalDist = totalDist + prevLatLong.distanceTo(currentLatLong);
        }
    }

    return totalDist;
}

/* SUMMARY: Calculates the total time spent on the route */
function getTotalTime() {
    var totalTime = 0;
    var startTime = Date.parse(route_data[0]["time"]);
    var endTime = Date.parse(route_data[route_data.length - 1]["time"]);
    totalTime = ((endTime - startTime) / 1000); // Millisecond to Second
    return totalTime;

}

/* SUMMARY: Calculates the sum of all heartrate values */
function getTotalBPM() {
    var totalBPM = 0;

    if (!("hr" in route_data[0]))
    {
        return "N/A";
    }
    for (var i = 0; i < route_data.length; i++) {
        totalBPM = totalBPM + parseInt(route_data[i]["hr"]);
    }
    return totalBPM;
}
/* >>>> END SUMMARY PANEL <<<< */


