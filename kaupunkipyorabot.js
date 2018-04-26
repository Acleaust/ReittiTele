//Kaupunkipyöräbot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');

//Aikaleimat konsoliin
require('console-stamp')(console, 'HH:MM:ss');

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
const wrongasemahaku = '{"bikeRentalStation":null}'


//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//---------- Komennot ----------

bot.on('/start', (msg) => {
    console.log("[info] Start viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään Kaupunkipyöräbottia!\n\nVoit tehdä /asema ja aseman numeron niin saat aseman sijainnin ja asemalla olevine paikkojen ja pyörien lukumäärän.\n\nVoit lähettää minulle sijainnin ja saat lähellä olevat kaupunkipyöräasemat ja saatavalla olevien pyörien määrän! 😃 `); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/help', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoit lähettäää botille sijainnin. Saat vastaukseksi lähimmät asemat ja pyörien saatavuudet.\n\nVoit etsiä tiettyä kaupunkipyöräasemaa tekemällä "/asema" ja kirjoittamalla aseman numeron "019" ja saat aseman tiedot ja sijainnin.\n\nMukavaa matkaa! 😃`); //Vastaa kun käyttäjä käyttää /help komentoa
});

bot.on('/asema', (msg) => {
    let text = msg.text;

    if (text == "/asema") {
        console.log("[info] Kysytty aseman numeroa.")
        return bot.sendMessage(msg.from.id, 'Anna aseman numero 😊', { ask: 'asemankoodi' }).then(re => { })
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, 'Hetkinen...').then(re => {

            //Poistaa /asema tekstin viestistä
            text = text.replace('/asema ', '');

            //Kutuu funktion
            asemahaku(msg.from.id, re.message_id, text);
        })
    }
})

//---------- Kysymykset ---------

bot.on('ask.asemankoodi', msg => {
    let text = msg.text;

    if (text == "/start" || text == undefined || text.includes("/asema") || text == "/help") {
        //Älä tee mitään
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, 'Hetkinen...').then(re => {

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
                return bot.editMessageText({ chatId, messageId }, `Asemaa ${viesti} ei löydy 😞`);
            } else {
                if (statusif == '["Station off"]') {
                    var name = jp.query(data, '$..name')
                    console.log("[info] Asema ei ole käytössä.")
                    return bot.editMessageText({ chatId, messageId }, `Asema ${viesti} - ${name}, ei ole käytössä 😞`);
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

                    var haettuasema = "Asema "+ code + " - " + name + " 🚲\n\nPyöriä saatavilla: " + bikesAvailable + "\nPaikkoja vapaana: " + spacesAvailable;
                }
            }
            bot.editMessageText({ chatId, messageId }, `${haettuasema}`);
            return bot.sendLocation(chatId, [lat, lon])
        })
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            return bot.editMessageText({ chatId, messageId }, `Ongelma pyynnössä. Kokeile uudestaan!`)
        })
};

//---------- Location ----------

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