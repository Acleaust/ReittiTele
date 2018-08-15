//
//  Kaupunkipyöräbot
//  Created by @AInkilainen & @larma (Telegram usernames)
//

//NPM
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat konsoliin

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser', 'floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 0.7,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const stationoff = '"Station off"'
const wrongasemahaku = '{"bikeRentalStation":null}'

//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//---------- Komennot ----------

// /start
bot.on('/start', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('/asema'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/help']
    ], { resize: true });
    bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään Kaupunkipyöräbottia!\n\nVoit tehdä /asema ja aseman numeron niin saat aseman sijainnin ja asemalla olevine paikkojen ja pyörien lukumäärän.\n\nVoit lähettää minulle sijainnin ja saat lähellä olevat kaupunkipyöräasemat ja saatavalla olevien pyörien määrän! 😃 `, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

bot.on('/help', (msg) => {
    bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoit lähettäää botille sijainnin. Saat vastaukseksi lähimmät asemat ja pyörien saatavuudet.\n\nVoit etsiä tiettyä kaupunkipyöräasemaa tekemällä "/asema" ja kirjoittamalla aseman numeron "019" ja saat aseman tiedot ja sijainnin.\n\nMukavaa matkaa! 😃`); //Vastaa kun käyttäjä käyttää /help komentoa
    return console.log("[info] Help viesti lähetetty!")
});

// /asema
bot.on('/asema', (msg) => {
    let text = msg.text;

    if (text == "/asema") {
        bot.sendMessage(msg.from.id, 'Anna aseman numero 😊', { replyMarkup: 'hide', ask: 'asemankoodi' }).then(re => { })
        return console.log("[info] Kysytty aseman numeroa.")
    } else {
        return bot.sendAction(msg.from.id, 'typing').then(re => {
            console.log("[info] Hetkinen...")
            //Poistaa /asema tekstin viestistä
            text = text.replace('/asema ', '');
            //Kutuu funktion
            asemahaku(msg.from.id, re.message_id, text);
        })
    }
})

// /menu
bot.on('/menu', msg => {
    //Rakentaa näppäimitön
    let replyMarkup = bot.keyboard([
        [bot.button('/asema'), bot.button('location', 'Sijaintisi mukaan 📍')],
    ], { resize: true });
    //Lähettää viestin
    bot.sendMessage(msg.from.id, 'Valitse toiminto.', { replyMarkup });
    return console.log("[info] Menu avattu!")
});

//---------- Kysymykset ---------

bot.on('ask.asemankoodi', msg => {
    let text = msg.text;

    if (text == "/start" || text == undefined || text.includes("/asema") || text == "/help" || text == "/menu") {
        //Älä tee mitään
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendAction(msg.from.id, 'typing').then(re => {
            asemahaku(msg.from.id, re.message_id, text);
        })
    }
});

//---------- Funktiot ---------

function asemahaku(chatId, messageId, viesti) {
    //Query
    const queryasemahaku = `{
        bikeRentalStation(id: "${viesti}") {
            state
            stationId
            name
            bikesAvailable
            spacesAvailable
            lat
            lon
        }
      }`

    return request(digiAPI, queryasemahaku)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            var status = jp.query(data, '$..state')
            var statusif = JSON.stringify(status)
            if (vastaus == wrongasemahaku) {
                console.log("[info] Asemaa ei löydy")
                return bot.sendMessage(chatId, `Asemaa ${viesti} ei löydy 😞`);
            } else {
                if (statusif == '["Station off"]') {
                    var name = jp.query(data, '$..name')
                    console.log("[info] Asema ei ole käytössä.")
                    return bot.sendMessage(chatId, `Asema ${viesti} - ${name}, ei ole käytössä 😞`);
                    //console.log("Hypätty yli!")
                } else {
                    //Hakee datan
                    var name = jp.query(data, '$..name')
                    var code = jp.query(data, '$..stationId')
                    var spacesAvailable = jp.query(data, '$..spacesAvailable')
                    var bikesAvailable = jp.query(data, '$..bikesAvailable')
                    var lat = jp.query(data, '$..lat')
                    var lon = jp.query(data, '$..lon')

                    var lat = JSON.stringify(lat)
                    var lon = JSON.stringify(lon)

                    var lat = lat.replace('[', '')
                    var lat = lat.replace(']', '')
                    var lon = lon.replace('[', '')
                    var lon = lon.replace(']', '')

                    var haettuasema = "Asema " + code + " - " + name + " 🚲\n\nPyöriä saatavilla: " + bikesAvailable + "\nPaikkoja vapaana: " + spacesAvailable;
                }
            }

            let replyMarkup = bot.keyboard([
                [bot.button('/asema'), bot.button('location', 'Sijaintisi mukaan 📍')],
            ], { resize: true });

            bot.sendMessage(chatId, `${haettuasema}`);
            bot.sendLocation(chatId, [lat, lon], { replyMarkup })
            return
        })
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            return bot.sendMessage(chatId, `Ongelma pyynnössä. Kokeile uudestaan!`)
        })
};

//---------- Location ----------

bot.on(['location'], (msg, self) => {
    let id = msg.from.id;
    let sijainti = msg.location;

    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')

    console.log(`[location] ${msg.chat.id}`)
    bot.sendAction(id, 'typing')

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
                        var distance = jp.query(node2, '$..distance')
                        var spacesAvailable = jp.query(node2, '$..spacesAvailable')
                        var bikesAvailable = jp.query(node2, '$..bikesAvailable')
                        //Yhdistää haetun datan
                        var yksittainenasema = name + "  " + code + " - " + distance + "m" + "\nPyöriä saatavilla: " + bikesAvailable + "\nPaikkoja vapaana:" + spacesAvailable + "\n\n"
                        //Yhdistää asemat 
                        if (asemat == null) {
                            asemat = yksittainenasema;
                        } else {
                            asemat = asemat + yksittainenasema;
                        }
                    }
                }
                if (asemat == undefined) {
                    console.log("[info] Viesti lähetetty! (Läheltä ei löytynyt käytössä olevia asemia.)")
                    return bot.sendMessage(msg.from.id, `Läheltäsi ei löytynyt käytössä olevia asemia 😞`)
                } else {
                    console.log("[info] Asemat lähetetty!")
                    return bot.sendMessage(msg.from.id, `Kaupunkipyöräasemat lähelläsi: 🚲\n\n${asemat}`)
                    var asemat = undefined
                }
            }
        })
})

//Botti pysyy päällä
bot.start();