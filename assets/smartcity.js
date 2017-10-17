let map, lampTimer, colorPicker,
    lampMarkers = [],
    lampAlertWindow = null,
    securityAlertMarkers = [],
    securityAlertInfoWindows = [],
    activeLampMarker = null;

const nwLat = 51.450102, nwLng = 5.451532, seLat = 51.443442, seLng = 5.463798;

function getRandomGeoPoint() {
  return {lng: nwLng + (Math.random() * (seLng - nwLng)), lat: seLat + (Math.random() * (nwLat - seLat))};
}

function delay_method(label, callback, time){
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

function initSecurityEvents() {
    const api = restful('https://smartcity-api.omines.nl'), dtf = new Intl.DateTimeFormat();
    api.header('Accept', 'application/json');
    api.addErrorInterceptor(function(err, config) {
        //$('#data').append(JSON.stringify(err, null, 2));
        console.error(err);
        return [err.message];
    });

    api.custom('authenticate').post({
        user: 'Niels',
        accessToken: 'test'
    }).then((response) => {
        api.header('Authorization', 'Bearer ' + response.body().data().token);

        api.all('datasets').getAll({name: 'strijp-security-events'}).then((response) => {
          const body = response.body();
          if (body.length !== 1) {
              throw new Error('There must be exactly 1 dataset named "%s"', emulator);
          }
          const dataset = body[0].data();
          api.one('datasets', dataset.id).custom('stream').get().then((response) => {
              const stream = response.body().data();
              const socket = new WebSocket(stream.url);
              socket.onopen = function(e) { console.log('Open', e); };
              socket.onmessage = function(e) {
                  var data = jQuery.parseJSON(e.data);
                  var id = data.record._id.$oid;
                  var found = false;
                  for (i=0;i<securityAlertMarkers.length;i++) {
                       if (securityAlertMarkers[i].id == id) {
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
                              lng: data.record.location.coordinates[0],
                              lat: data.record.location.coordinates[1]
                          },
                          map: map,
                          draggable: false,
                          icon: getArrowIcon(1)
                      }));
                      var alertInfoWindow = new google.maps.InfoWindow({
                          content: '<h4>' + data.record.message + '</h4>'
                                   + new Date(data.record.timestamp).toLocaleString()
                                   + '<br/>'
                                   + '<form></form>'
                      });
                      alertMarker.addListener('click', function() {
                          alertInfoWindow.open(map, alertMarker);
                      });

                      securityAlertMarkers.unshift({
                          id: id,
                          marker: alertMarker
                      });
                      securityAlertInfoWindows.unshift(alertInfoWindow);

                      if (securityAlertMarkers.length > 10) {
                         securityAlertMarkers.pop().marker.setMap(null);
                         securityAlertInfoWindows.pop();
                     }

                     for (i=1;i<securityAlertMarkers.length;i++) {
                         // we will reduce opacity of all older alerts
                         securityAlertMarkers[i].marker.setIcon(getArrowIcon(1 - (i*0.1)));
                     }
                  }
              };
              socket.onerror = function(e) { console.log('Error', e)};
              socket.onclose = function(e) { console.log('Close', e)};

          });
        });
    }).catch((error) => {
        console.error(error);
    });
}

function placeStreetlights() {
    lampAlertWindow = new google.maps.InfoWindow({
        content: '<div id="lamp_color_picker" style="width:148px;height:126px"></div>'
    });
    for (i = 0; i < 6; i++) {
        placeStreetlight(684);
    }
}

function placeStreetlight(light)
{
    let id = light._id.$oid;
    console.log(light);
    let marker = new google.maps.Marker({
        position: {
            lng: light.location.coordinates[0],
            lat: light.location.coordinates[1]
        },
        map: map,
        draggable: false,
        icon: getCircleIcon('#ffffff'),
        marker_key: id,
        lamp_id: id,
        lamp_color: '#ffffff'
    });
    marker.addListener('click', function(e) {
        if (activeLampMarker) {
            activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color));
        }

        activeLampMarker = marker;
        activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color, 2));
        lampAlertWindow.open(map, marker);

        if (colorPicker) {
            colorPicker.colorpicker('setValue', activeLampMarker.lamp_color);
        }
        else {
            colorPicker = $('#lamp_color_picker');
            colorPicker.colorpicker({
                color: activeLampMarker.lamp_color,
                container: true,
                inline: true
            });
        }

        colorPicker.colorpicker().on('changeColor', function(e) {
            activeLampMarker.lamp_color = e.color.toString('hex');
            activeLampMarker.setIcon(getCircleIcon(activeLampMarker.lamp_color, 2));
            delay_method( "lamp_change", function() {
                // lamp colour only changed every 200ms
                console.log('[' + activeLampMarker.lamp_id + '] => ' + activeLampMarker.lamp_color);
            }, 200);
        });
    });
    lampMarkers.push(marker);
}

