//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');

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
var hetki = "Hetkinen..."
var hetki2 = "Haetaan aikatauluja..."
//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//---------- Komentoja ----------
bot.on('/start', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/hide']
    ], { resize: true });
    console.log("[info] Start viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/help', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoi etsiä pysäkkejä kirjoittamalla "/hae" ja pysäkin nimen.\nEsim. "/hae keilaniemi"\n\nVoit myös lähettää sijaintisi ja saadä lähistöltä lähdöt. Jos lähelläsi ei ole pysäkkejä, kokeile lähettää sijainti pysäkin läheltä.\n\nJos löydät bugin voit reportoida sen tekemällä /bugi\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/bugi', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name}, löysitkö bugin? Jos löysit bugin voit reportoida sen tänne: https://goo.gl/forms/o1dIISSchWKluJ8A2\n\nVoit myös ottaa yhteyttä kehittäjään laittamalla viestiä @ainkilainen\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Vaihtoehdot piilotettu', { replyMarkup: 'hide' }
    );
});

//Vastaa stikkeriin stikkerillä
bot.on('sticker', (msg) => {
    console.log(`[sticker] ${msg.chat.id}`)
    return msg.reply.sticker('img/1.webp', { asReply: true });
});

// Menu
bot.on('/menu', msg => {

    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/hide']
    ], { resize: true });

    return bot.sendMessage(msg.from.id, 'Valitse toiminto.', { replyMarkup });
});
bot.on('/admin', (msg) => {
    if (msg.from.id == 81023943 || msg.from.id == 86734737) {
        console.log("[info] Admin tunnistettu")
        let replyMarkup = bot.keyboard([
            ['/adminhairio'],
            ['/hide']
        ], {resize: true});
        return bot.sendMessage(msg.from.id, `Admin menu:`, {replyMarkup})
    } else {
        console.log("[info] Adminia ei tunnistettu")
    }
});

bot.on('/adminhairio', (msg) => {
    if (msg.from.id == 81023943 || msg.from.id == 86734737) {
        console.log("[info] Admin tunnistettu")
        if (hetki == "Hetkinen...") {
            hetki = "Hetkinen...\nHäiriö voi hidastaa hakua."
            hetki2 = "Haetaan aikatauluja...\nHäiriö voi hidastaa hakua."
            console.log("[info] Admin - Häiriö viesti lisätty!")
            bot.sendMessage(81023943, `Häiriö lisätty.`);
            return bot.sendMessage(86734737, `Häiriö lisätty.`);
        } else {
            hetki = "Hetkinen..."
            hetki2 = "Haetaan aikatauluja..."
            console.log("[info] Admin - Häiriö viesti poistettu!")
            bot.sendMessage(81023943, `Häiriö poistettu.`);
            return bot.sendMessage(86734737, `Häiriö poistettu.`);
        }
    } else {
        console.log("[info] Adminia ei tunnistettu")
    }
});

//---------- MAIN ----------

//---------- /hae ----------
bot.on('/hae', msg => {
    let text = msg.text;

    if (text == '/hae') {
        console.log("[info] Kysytty pysäkkiä.")
        return bot.sendMessage(msg.from.id, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => { })
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {
            //Poistaa kauttaviivan
            text = text.replace('/hae ', '');
            //Kutuu funktion
            pysakkihaku(msg.from.id, re.message_id, text);
        })
    }
});

//---------- /linja ----------
bot.on('/linja', msg => {
    let text = msg.text;

    if (text == '/linja') {
        console.log("[info] Kysytty linjaa.")
        return bot.sendMessage(msg.from.id, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' }).then(re => { })
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {
            //Poistaa kauttaviivan
            text = text.replace('/linja ', '');
            //Kutuu funktion
            maaranpaat(msg.from.id, re.message_id, text);
        })
    }
});

//---------- Kysymykset ----------

bot.on('ask.pysakkinimi', msg => {
    let text = msg.text;

    if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text == "/linja" || text == "/menu" || text.includes("/admin")) {
        //Älä tee mitään
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {

            pysakkihaku(msg.from.id, re.message_id, text);
        })
    }
});

bot.on('ask.askpysakkivalinta', msg => {
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/linja" || valinta == "/menu"|| valinta.includes("/admin")) {
        //Älä tee mitään
    } else {
        if (valinta.includes("/")) {

            console.log("[info] Haetaan aikatauluja...")
            return bot.sendMessage(msg.from.id, `${hetki2}`).then(re => {

                valintafunktio(msg.from.id, re.message_id, valinta);
            })
        } else {
            bot.sendMessage(msg.from.id, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Ei pysäkin koodia!'));
            //Do nothing
        }
    }
});

bot.on('ask.linjatunnus', msg => {
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/menu" || valinta.includes("/admin")) {
        //Älä tee mitään
    } else {

        console.log("[info] Haetaan määränpäät...")
        return bot.sendMessage(msg.from.id, 'Haetaan määränpäitä...').then(re => {

            maaranpaat(msg.from.id, re.message_id, valinta);
        })
    }
});
//---------- Funktiot ----------

function pysakkihaku(chatId, messageId, viesti) {
    //Hakulause
    const query = `{
	    stops(name: "${viesti}") {
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
                //console.log("[info] Viesti lähetetty! (Pysäkkejä ei löytynyt)")
                bot.sendMessage(chatId, ``, { ask: 'pysakkinimi' }).catch(error => console.log('[info] Pysäkkejä ei löytynyt!'));
                return bot.editMessageText({ chatId, messageId }, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi' });
            } else {
                //Hakee pyäkit ja koodit niille
                var pysakit = jp.query(data, '$..name')
                var koodit = jp.query(data, '$..code')
                //Erittelee pysäkit ja yhdistää koodit
                for (i = 0; i < pysakit.length; i += 1) {
                    koodi = koodit[i]
                    var pk = "/" + koodi + " " + pysakit[i] + " - " + koodit[i] + "\n"
                    //Tallentaa muuttujaan pysäkit + koodit viestiä varten
                    if (pysakkivalinta == null) {
                        pysakkivalinta = pk;
                        var nappaimisto = []
                        nappaimisto.push("/" + koodi)
                    } else {
                        pysakkivalinta = pysakkivalinta += pk;
                        nappaimisto.push("/" + koodi)
                    }
                }
                nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));

                var nappaimistoStdAla = ['/hae', '/hide']
                //Näppäimistö
                let replyMarkup = bot.keyboard([nappaimisto2, nappaimisto, nappaimistoStdAla], { resize: true });
                //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                console.log("[info] Valinnat lähetetty!")
                bot.editMessageText({ chatId, messageId }, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`)
                return bot.sendMessage(chatId, `Voit valita pysäkin myös näppäimistöstä! 😉`, { replyMarkup, ask: 'askpysakkivalinta' })//.catch(error => console.log('[info] Valinnat lähetetty!'));
                //return bot.sendMessage(chatId , `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'askpysakkivalinta' })
                var pysakkivalinta = undefined;
                var nappaimisto = undefined;
            }
        }
        )
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            return bot.editMessageText({ chatId, messageId }, `Ongelma pyynnössä. Kokeile uudestaan!`)
        })
};

//Valintafunktio
function valintafunktio(chatId, messageId, valinta) {
    if (valinta == '/') {
        return bot.editMessageText({ chatId, messageId }, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
    }
    //Poistaa "/" merkin
    valintavastaus = valinta.replace('/', '');
    if (valintavastaus.includes(' ')) {
        valintavastaus = valintavastaus.replace(' ', '')
    }
    //Query
    const querygetstoptimesforstops = `{
            stops(name: "${valintavastaus}") {
              name
              code
              stoptimesWithoutPatterns (numberOfDepartures: 10) {
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
                    var realtimeNUM = Number(realtime)
                    //Muunto
                    var departuretime = TimeFormat.fromS(realtimeNUM, 'hh:mm');
                    var departuretimeshort = limit(departuretime, 5)
                    if (realtimeNUM > 86400) {
                        var departuretimeshort = departuretimeshort.replace('24:', '00:')
                    } if (realtimeNUM > 90000) {
                        var departuretimeshort = departuretimeshort.replace('25:', '01:')
                    } if (realtimeNUM > 93600) {
                        var departuretimeshort = departuretimeshort.replace('26:', '02:')
                    } if (realtimeNUM > 97200) {
                        var departuretimeshort = departuretimeshort.replace('27:', '03:')
                    } if (realtimeNUM > 100800) {
                        var departuretimeshort = departuretimeshort.replace('28:', '04:')
                    }
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
                //console.log("[info] Ei lähtöjä.")
                bot.sendMessage(chatId, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Ei lähtöjä.'));
                return bot.editMessageText({ chatId, messageId }, `Ei lähtöjä pysäkiltä.`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            } else {
                //console.log("[info] Vastaus lähetetty!")
                bot.sendMessage(chatId, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Vastaus lähetetty!'));
                return bot.editMessageText({ chatId, messageId }, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            }
        })
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            console.log(err)
            return bot.editMessageText({ chatId, messageId }, `Ongelma valinnassa. Kokeile uudestaan!`)
        })
}

function maaranpaat(chatId, messageId, viesti) {

    //Hakulause
    const query = `{
        routes(name: "${viesti}") {
          id
          shortName
          longName
          desc
          patterns {
            id
            headsign
          }
        }
      }`

    return request(digiAPI, query)
        .then(function (data) {
            //Datan haku queryn vastauksesta
            var desc = jp.query(data, '$..desc')
            var shortNames = jp.query(data, '$..shortName')
            var patterns = jp.query(data, '$..patterns')

            for (i = 0; i < desc.length; i += 1) {
                var shortName = shortNames[i];
                var pattern = patterns[i];
                if (shortName == viesti) {
                    var maaranpaat = jp.query(pattern, '$..headsign')
                    var iideeahaku = jp.query(pattern, '$..id')
                    for (i = 0; i < maaranpaat.length; i += 1) {
                        var maaranpaa = maaranpaat[i]
                        var iidee = iideeahaku[i]
                        console.log(maaranpaa)
                        console.log(iidee)
                        var maaranpaalista
                        if (maaranpaalista == undefined) {
                            maaranpaalista = maaranpaa + "\n"
                        } else {
                            maaranpaalista = maaranpaalista + maaranpaa
                        }
                    }
                } else {
                    //DO NOTHING
                }
            }
            return bot.editMessageText({ chatId, messageId }, `Määränpäät linjalle ${shortName}:\n\n${maaranpaalista}`);
        })
}

//---------- Location ----------
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
                        var realtimeNUM = Number(realtime)
                        //Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var departuretime = TimeFormat.fromS(realtimeNUM, 'hh:mm');
                        var departuretimeshort = limit(departuretime, 5)
                        if (realtimeNUM > 86400) {
                            var departuretimeshort = departuretimeshort.replace('24:', '00:')
                        } if (realtimeNUM > 90000) {
                            var departuretimeshort = departuretimeshort.replace('25:', '01:')
                        } if (realtimeNUM > 93600) {
                            var departuretimeshort = departuretimeshort.replace('26:', '02:')
                        } if (realtimeNUM > 97200) {
                            var departuretimeshort = departuretimeshort.replace('27:', '03:')
                        } if (realtimeNUM > 100800) {
                            var departuretimeshort = departuretimeshort.replace('28:', '04:')
                        }
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
                    console.log("[info] Location viesti lähetetty!")
                    return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${lahdot}`);
                    var lahdot = undefined;
                }
            }
        })
});

//Sovelluksen pyöritys. Älä poista!
bot.start();