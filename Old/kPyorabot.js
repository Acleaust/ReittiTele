//Kaupunkipyöräbot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');

//Aikaleimat logiin
require('console-stamp')(console, '[HH:MM:ss.l]');


//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser']
});

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const stationoff = '"Station off"'
var asemat

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//Komennot
bot.on('/start', (msg) => {
    console.log("[info] Start viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään Kaupunkipyöräbottia!\n\nVoit lähettää minulle sijainnin ja saat lähellä olevat kaupunkipyöräasemat ja saatavalla olevien pyörien määrän! 😃 `); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/help', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoit lähettäää botille sijainnin. Muut komennot tulevat myöhemmin.`); //Vastaa kun käyttäjä käyttää /help komentoa
});

//Pääohjelma
bot.on(['location'], (msg, self) => {
    let id = msg.from.id;
    let text = msg.text;
    let sijainti = msg.location;

    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')

    console.log(`[location] ${msg.chat.id}`)

    //Query
    const citybikelocationquery = `{
        places: nearest(
          lat: ${latitude}, 
          lon: ${longitude}, 
          maxDistance: 600, 
          maxResults: 20, 
          first: 20, 
          filterByPlaceTypes: BICYCLE_RENT) {
          edges {
            node {
              distance
              place {
                ... on BikeRentalStation {
                  stationId
                  name
                  spacesAvailable
                  bikesAvailable
                  state
                }
              }
            }
          }
        }
      }`

    //Hakulauseen suoritus
    return request(digiAPI, citybikelocationquery)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            if (vastaus == LOCvaaravastaus) {
                console.log("[info] Viesti lähetetty! (Läheltä ei löytynyt asemia.)")
                return bot.sendMessage(id, `Läheltäsi ei valitettavastai löydy asemia 😞`);
            } else {
                //Datan haku queryn vastauksesta
                var nodehaku = jp.query(data, '$..node')
                var status = jp.query(nodehaku, '$..state')

                //Erotellaan lähdöt toisitaan
                for (i = 0; i < nodehaku.length; i += 1) {
                    var statusif = JSON.stringify(status[i])
                    var node2 = nodehaku[i]
                    //Jos asema on pois käytöstä skippaa!
                    if (statusif == stationoff) {
                        //console.log("Hypätty yli!")
                    } else {
                        //Hakee datan
                        var name = jp.query(node2, '$..name')
                        var code = jp.query(node2, '$..stationId')
                        var spacesAvailable = jp.query(node2, '$..spacesAvailable')
                        var bikesAvailable = jp.query(node2, '$..bikesAvailable')
                        //Yhdistää haetun datan
                        var yksittainenasema = name + " - " + code + "\nPyöriä saatavilla: " + bikesAvailable + "/" + spacesAvailable + "\n\n"
                        //Yhdistää asemat 
                        if (asemat == null) {
                            asemat = yksittainenasema;
                        } else {
                            asemat = asemat + yksittainenasema;
                        }}}
                if (asemat == undefined) {
                    console.log("[info] Viesti lähetetty! (Läheltä ei löytynyt käytössä olevia asemia.)")
                    return bot.sendMessage(msg.from.id, `Läheltäsi ei löytynyt käytössä olevia asemia 😞`)
                } else {
                    console.log("[info] Asemat lähetetty!")
                    return bot.sendMessage(msg.from.id, `Kaupunkipyöräasemat lähelläsi:\n\n${asemat}`)
                    var asemat = undefined
                }}})})

//Asema komento
bot.on('/asema', (msg) => {
    let id = msg.from.id;
    let text = msg.text;
    
    text2 = text.replace('/asema ', '');


    console.log("[info] /asema viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `WIP`)
})

//Botti pysyy päällä
bot.start();