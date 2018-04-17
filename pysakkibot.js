//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var fs = require('fs');

//Aikaleimat logiin
require('console-stamp')(console, 'HH:MM:ss');

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser']
});
//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
var pysakkivalinta;
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const LOCvaaravastaus2 = '[]'
var lahdot;

//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//-----------------------------------------------

//Komennot
bot.on('/start', (msg) => {
    console.log("[info] Start viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/help', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoi etsiä pysäkkejä kirjoittamalla "/hae" ja pysäkin nimen.\nEsim. "/hae keilaniemi"\n\nVoit myös lähettää sijaintisi ja saadä lähistöltä lähdöt. Jos lähelläsi ei ole pysäkkejä, kokeile lähettää sijainti pysäkin läheltä.\n\nToivottavasti pääset jatkamaan näillä ohjeilla! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//-----------------------------------------------

//Koko "pääohjelma"

//Käyttäjän sijainnista
bot.on(['location'], (msg, self) => {
    let id = msg.from.id;
    let text = msg.text;
    let sijainti = msg.location;

    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')

    console.log(`[location] ${msg.chat.id}`)
    //Query
    const querygetlocation = `{
        places: nearest(
        lat: ${latitude},
        lon: ${longitude},
        maxDistance: 500, 
        maxResults: 20,
        first:20,
        filterByPlaceTypes: DEPARTURE_ROW
          ) {
        edges {
          node {
            distance
            place {
              ... on DepartureRow {
                stoptimes(timeRange: 7200, numberOfDepartures: 1, startTime: 0) {
                  pickupType
                  realtimeDeparture
                  headsign
                  trip {
                    pattern {
                      route {
                        shortName
                      }
                    }
                  }
                  stop {
                    name
                    code
                    platformCode
                  }
                }
              }
            }
          }
        }
      }
    }`

    //Hakulauseen suoritus
    return request(digiAPI, querygetlocation)
        .then(function (data) {
            var vastaus = JSON.stringify(data);
            if (vastaus == LOCvaaravastaus) {
                return bot.sendMessage(id, `Läheltäsi ei valitettavastai löydy pysäkkejä.`);
                console.log("[info] Viesti lähetetty! (Läheltä ei löytynyt pysäkkejä.)")
            } else {
                //Datan haku queryn vastauksesta
                var nodehaku = jp.query(data, '$..node')
                var stoptimes = jp.query(nodehaku, '$..stoptimes')

                //Erotellaan lähdöt toisitaan
                for (i = 0; i < nodehaku.length; i += 1) {
                    var stoptimesif = JSON.stringify(stoptimes[i])
                    var stoptimes2 = stoptimes[i]
                    var node2 = nodehaku[i]

                    if (stoptimesif == "[]") {
                        //console.log("Hypätty yli!")
                    } else {
                        //Ajan haku ja muunto tunneiksi ja minuuteiksi
                        var realtime = jp.query(stoptimes2, '$..realtimeDeparture')
                        var realtime2 = Number(realtime)
                        //Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var departuretime = TimeFormat.fromS(realtime2, 'hh:mm');
                        var departuretimeshort = limit(departuretime, 5)
                        //Hakee linjan numeron tai kirjaimen
                        var numlet = jp.query(node2, '$..shortName')
                        //Hakee Määränpään
                        var headsign = jp.query(stoptimes2, '$..headsign')
                        //Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes2, '$..code')

                        //Konsoliin kaikki
                        //console.log(JSON.stringify(departuretime+"  "+numlet +" "+ headsign+" - "+pysakkikoodi))
                        var yksittainenlahto = departuretimeshort + "  " + numlet + " " + headsign + " - " + pysakkikoodi + "\n";
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                            //console.log("Tyhjään lahtöön lisäys")
                        } else {
                            //console.log("Lahtöön lisäys")
                            lahdot = lahdot + yksittainenlahto;
                            //console.log(lahdot)
                        }
                    }
                }
                //Viestin lähetys
                //Jos ei lähtöjä lähellä
                if (lahdot == undefined) {
                    console.log("[info] Ei lähtöjä viesti lähetetty.")
                    return bot.sendMessage(msg.from.id, `Ei lähtöjä lähistöllä`);
                    var lahdot = undefined;
                } else {
                    console.log("[info] Viesti lähetetty!")
                    return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${lahdot}`);
                    var lahdot = undefined;
                }
            }
        })
});

//-----------------------------------------------

// Etsii /hae viestistä pysäkin nimeä
bot.on(['/hae', '/HAE'], msg => {
    let id = msg.from.id;
    let text = msg.text;

    //Poistaa komennon (gi == case sensitive) idk tosi paska menetelmä tehä tää mut toimii
    text = text.replace('/hae ', '');
    text = text.replace('/', '')
    text = text.replace(/hae /gi, "")
    text = text.replace(/hae/gi, "")
    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (text == "/hae" || text == "") {
        console.log("[info] Hae opastus lähetetty!")
        return bot.sendMessage(id, `Voit etsiä pysäkkejä kirjoittamalla /hae ja pysäkin nimi tai koodi samaan viestiin. Jos tarvitset lisäapua - /help!`)
    } else {
        //Hakulause
        const query = `{
	    stops(name: "${text}") {
        gtfsId
        name
        code
        }
        }`

        //Hakulauseen suoritus
        return request(digiAPI, query)
            .then(function (data) {
                var vastaus = JSON.stringify(data);
                //Jos pysäkkiä ei löydy
                if (vastaus == vaaravastaus) {
                    console.log("[info] Viesti lähetetty! (Pysäkkejä ei löytynyt)")
                    return bot.sendMessage(id, `Pysäkkiä "${text}" ei valitettavasti löydy.`);
                } else {
                    //Hakee pyäkit ja koodit niille
                    var pysakit = jp.query(data, '$..name')
                    var koodit = jp.query(data, '$..code')
                    //Erittelee pysäkit ja yhdistää koodit
                    for (i = 0; i < pysakit.length; i += 1) {
                        var pk = "/" + koodit[i] + " " + pysakit[i] + " - " + koodit[i] + "\n"
                        //Tallentaa muuttujaan pysäkit + koodit viestiä varten
                        if (pysakkivalinta == null) {
                            pysakkivalinta = pk;
                        } else {
                            pysakkivalinta = pysakkivalinta += pk;
                        }
                    }
                    //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                    const id = msg.from.id;
                    console.log("[info] Valinnat lähetetty!")
                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'valinta' });
                    var pysakkivalinta = undefined;
                }
            })
    }
})
//-----------Vastaus edelliseen------------------
//Vastaus
bot.on('ask.valinta', msg => {
    const id = msg.from.id;
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/linja" || valinta.includes("/HAE")) {
        //console.log("[info] /start tai /hide")
        //Älä tee mitään
    } else {
        valintavastaus = valinta.replace('/', '');

        const querygetstoptimesforstops = `{
            stops(name: "${valintavastaus}") {
              name
              code
              stoptimesWithoutPatterns (numberOfDepartures: 8) {
                realtimeDeparture
                headsign
                trip {
                  pattern {
                    route {
                      shortName
                    }
                  }
                }
              }
            }
          }`

        //Hakulauseen suoritus
        return request(digiAPI, querygetstoptimesforstops)
            .then(function (data) {
                var vastaus = JSON.stringify(data);
                //Datan haku queryn vastauksesta
                var stopshaku = jp.query(data, '$..stops')
                var stoptimeshaku = jp.query(stopshaku, '$..stoptimesWithoutPatterns')
                var realtimehaku = jp.query(data, '$..realtimeDeparture')

                for (i = 0; i < realtimehaku.length; i += 1) {
                    var stoptimesif = JSON.stringify(stoptimeshaku[i])
                    var realtime = realtimehaku[i]
                    if (stoptimesif == "[]") {
                        //console.log("Hypätty yli")
                        //Do nothing
                    } else {
                        //Pysäkin nimi
                        var pysakki = jp.query(stopshaku, '$..name')
                        var koodi = jp.query(stopshaku, '$..code')

                        //ajan haku ja muunto tunneiksi ja sekunneiksi
                        var realtime3 = Number(realtime)
                        //Muunto
                        var departuretime = TimeFormat.fromS(realtime3, 'hh:mm');
                        var departuretimeshort = limit(departuretime, 5)
                        //Hakee linjan numeron tai kirjaimen
                        var numlet = jp.query(data, '$..shortName')
                        //Hakee määränpään
                        var headsign = jp.query(stopshaku, '$..headsign')
                        var headsingif = headsign[i]
                        if (headsingif == null) {
                            //console.log("[debug] Null skip")
                            //Älä tee mitään
                        } else {
                            //Yhdistys
                            var yksittainenlahto = departuretimeshort + "  " + numlet[i] + " " + headsingif + "\n";

                            if (lahdot == null) {
                                lahdot = yksittainenlahto;
                                //console.log("Tyhjään lahtöön lisäys")
                            } else {
                                //console.log("Lahtöön lisäys")
                                lahdot = lahdot + yksittainenlahto;
                                //console.log(lahdot)
                            }
                        }
                    }
                }
                if (lahdot == undefined) {
                    console.log("[info] Ei lähtöjä.")
                    return bot.sendMessage(msg.from.id, `Ei lähtöjä pysäkiltä.`, { ask: 'valinta' });
                    var lahdot = undefined;
                } else {
                    console.log("[info] Vastaus lähetetty!")
                    return bot.sendMessage(msg.from.id, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { ask: 'valinta' });
                    var lahdot = undefined;
                }
                //return bot.sendMessage(id, `Valitsit pysäkin: ${ valintavastaus }`);
            })
    }
});

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Pysäkkivaihtoehdot piilotettu', { replyMarkup: 'hide' }
    );
});

//Vastaa stikkeriin stikkerillä
bot.on('sticker', (msg) => {
    console.log(`[sticker] ${msg.chat.id}`)
    return msg.reply.sticker('img/1.webp', { asReply: true });
});

//Sovelluksen pyöritys. Älä poista!
bot.start();