//Pysäkkibot
const TeleBot = require('telebot');
var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');

//BotToken
const bot = new TeleBot('497887822:AAEjHktk0N2wmVRbJEe93Ma637UOcaHtxZE');

//Komennot
bot.on('/start', (msg) => {
  return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! `); //Vastaa kun käyttäjä käyttää /start komentoa
});

var req = {
  url: 'http://api.digitransit.fi/realtime/service-alerts/v1/',
  encoding: null
};
bot.on('/info', (msg) => {
request(req, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
    feed.entity.forEach(function (entity) {
      if (entity.alert) {
        console.log(JSON.stringify(entity.alert, null, 2));
        var vastaus = JSON.stringify(entity.alert, null, 2)
        return bot.sendMessage(msg.from.id, `${vastaus}`);
      }
    });
  }
})});

//Botti pysyy päällä
bot.start();