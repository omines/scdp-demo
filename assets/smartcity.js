let map, heatmap, hmPoints = [], colorPicker,
    lampMarkers = [],
    lampAlertWindow = null,
    markerGroups = [],
    securityAlertMarkers = [],
    securityAlertInfoWindows = [],
    activeLampMarker = null;

const nwLat = 51.450102, nwLng = 5.451532, seLat = 51.443442, seLng = 5.463798;

function initDemo() {
    lampAlertWindow = new google.maps.InfoWindow({
        content: '<div class="popup"><h4 id="lamp-name"></h4><div id="lamp_color_picker" style="width:148px;height:126px"></div></div>'
    });
}

function getRandomGeoPoint() {
  return {lng: nwLng + (Math.random() * (seLng - nwLng)), lat: seLat + (Math.random() * (nwLat - seLat))};
}

function delayCall(label, callback, time){
    if (typeof window.delayed_methods === "undefined") {
        window.delayed_methods = {};
    }
    delayed_methods[label] = Date.now();
    let t = delayed_methods[label];
    setTimeout(function() {
        if (delayed_methods[label] === t) {
            callback();
        }
    }, time||500);
}

function getCircleIcon(fillColor, stroke) {
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillOpacity: 1,
        strokeWeight: stroke ? stroke : 1,
        strokeOpacity: 0.6,
        fillColor: fillColor,
        strokeColor: '#2C78BF'
    }
}

function getArrowIcon(opacity, fillColor, strokeColor) {
    return {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 7,
        fillOpacity: opacity,
        strokeWeight: 1,
        strokeOpacity: Math.max((opacity-0.1), 0.1),
        fillColor: fillColor,
        strokeColor: strokeColor
    }
}

function placeStreetlight(light, callback)
{
    let id = light._id.$oid, marker = new google.maps.Marker({
        position: {
            lng: light.location.coordinates[0],
            lat: light.location.coordinates[1]
        },
        map: map,
        draggable: false,
        icon: getCircleIcon('#ffffff'),
        marker_key: id,
        lamp_id: id,
        lamp_info: light,
        lamp_color: '#ffffff'
    });
    marker.addListener('click', function(e) {
        if (activeLampMarker) {
            activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color));
        }

        activeLampMarker = marker;
        activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color, 3));
        lampAlertWindow.open(map, marker);

        console.log(marker.lamp_info);
        $('#lamp-name').text(marker.lamp_info.straatnaam);
        if (colorPicker) {
            colorPicker.colorpicker('setValue', activeLampMarker.lamp_color);
        } else {
            colorPicker = $('#lamp_color_picker');
            colorPicker.colorpicker({
                color: activeLampMarker.lamp_color,
                container: true,
                inline: true
            });
        }

        colorPicker.colorpicker().on('changeColor', function(e) {
            activeLampMarker.lamp_color = e.color.toString('hex');
            activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color, 3));
            delayCall('lamp_change', function() {
                // lamp colour only changed every 200ms
                callback(activeLampMarker.lamp_color);
            }, 200);
        });
    });
    lampMarkers.push(marker);
}

function placeCamera(camera, callback) {
    let id = camera._id.$oid, marker = new google.maps.Marker({
        position: {
            lat: camera.location.coordinates[0],
            lng: camera.location.coordinates[1],
        },
        map: map,
        draggable: false,
        icon: {
            url: 'assets/camera.png',
            scaledSize: new google.maps.Size(64, 64),
        },
        marker_key: id,
        camera_info: camera,
    });
    const infoWindow = new google.maps.InfoWindow({
        content: `<h4>${camera.name}</h4><iframe src="${camera.videoUrl}"></iframe><p>${camera.description} <a href="${camera.videoUrl}" target="_blank" rel="noopener">(new tab)</a></p>`,
    });
    marker.addListener('click', e => {
        infoWindow.open(map, marker);
    });
}

function processSecurityEvent(data, group, fill, stroke) {
    if (!markerGroups[group]) markerGroups[group] = [];
    let id = data.record._id.$oid, found = false, markerGroup = markerGroups[group], location = data.record.location;
    for (i=0;i<markerGroup.length;i++) {
        if (markerGroup[i].id === id) {
            found = true;
            break;
        }
    }

    if (found) {
        console.log('Marker already exists');
    }
    else {
        var alertMarker = new google.maps.Marker(Object.assign({'title':data.record.message}, {
            position: {
                'lng': location.coordinates[0],
                'lat': location.coordinates[1]
            },
            map: map,
            draggable: false,
            icon: getArrowIcon(1, fill, stroke)
        }));
        var alertInfoWindow = new google.maps.InfoWindow({
            content: '<div class="popup"><h4>' + data.record.message + '</h4>'
            + new Date(data.record.timestamp).toLocaleString()
            + '<br/>'
            + '<form></form></div>'
        });
        alertMarker.addListener('click', function() {
            alertInfoWindow.open(map, alertMarker);
        });

        markerGroup.unshift({
            id: id,
            marker: alertMarker
        });
        securityAlertInfoWindows.unshift(alertInfoWindow);

        if (markerGroup.length > 10) {
            markerGroup.pop().marker.setMap(null);
            securityAlertInfoWindows.pop();
        }

        for (i=1;i<markerGroup.length;i++) {
            // we will reduce opacity of all older alerts
            markerGroup[i].marker.setIcon(getArrowIcon(1 - (i*0.1), fill, stroke));
        }

        hmPoints.forEach(p => p.weight--);
        hmPoints.unshift({location: new google.maps.LatLng(location.coordinates[1], location.coordinates[0]), weight: 25});
        if (hmPoints.length > 25) hmPoints.pop();
        heatmap.setData(hmPoints);
    }
}

