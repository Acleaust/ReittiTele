var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');

var req = {
  url: 'http://api.digitransit.fi/realtime/service-alerts/v1/',
  encoding: null
};

request(req, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
    feed.entity.forEach(function(entity) {
      if (entity.alert) {
        console.log(JSON.stringify(entity.alert,null,2));
      }
    });
  }});