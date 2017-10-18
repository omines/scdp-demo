let map, colorPicker,
    lampMarkers = [],
    lampAlertWindow = null,
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

function getArrowIcon(opacity) {
    return {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 7,
        fillOpacity: opacity,
        strokeWeight: 1,
        strokeOpacity: Math.max((opacity-0.1), 0.1),
        fillColor: '#BA1111',
        strokeColor: '#2C78BF'
    }
}

function placeStreetlight(light)
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
                console.log('[' + activeLampMarker.lamp_id + '] => ' + activeLampMarker.lamp_color);
            }, 200);
        });
    });
    lampMarkers.push(marker);
}

