//
//  Pysäkkibot
//  Created by @AInkilainen & @larma (Telegram usernames)
//

//NPM
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat logiin

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser']
});

//Muuttujia
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
const LOCvaaravastaus = '{"places":{"edges":[]}}'
var hetki = "Hetkinen..."
var hetki2 = "Haetaan aikatauluja..."
//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//---------- Komentoja ----------

// /start
bot.on('/start', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/hide']
    ], { resize: true });
    bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

// /help
bot.on('/help', (msg) => {
    bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoi etsiä pysäkkejä kirjoittamalla "/hae" ja pysäkin nimen.\nEsim. "/hae keilaniemi"\n\nVoit myös lähettää sijaintisi ja saadä lähistöltä lähdöt. Jos lähelläsi ei ole pysäkkejä, kokeile lähettää sijainti pysäkin läheltä.\n\nJos löydät bugin voit reportoida sen tekemällä /bugi\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Help viesti lähetetty!")
});

// /bugi
bot.on('/bugi', (msg) => {
    bot.sendMessage(msg.from.id, `${msg.from.first_name}, löysitkö bugin? Jos löysit bugin voit reportoida sen tänne: https://goo.gl/forms/o1dIISSchWKluJ8A2\n\nVoit myös ottaa yhteyttä kehittäjään laittamalla viestiä @ainkilainen\n\nMukavaa matkaa! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Help viesti lähetetty!")
});

// /hide (piilottaa näppäimistön)
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Vaihtoehdot piilotettu.', { replyMarkup: 'hide' }
    );
});

//Stikkeriin vastaus
bot.on('sticker', (msg) => {
    //Lähettää stikkerin 1.webp vastauksena
    msg.reply.sticker('img/1.webp', { asReply: true });
    return console.log(`[sticker] ${msg.chat.id}`)
});

// /menu
bot.on('/menu', msg => {
    //Rakentaa näppäimitön
    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
        ['/hide']
    ], { resize: true });
    //Lähettää viestin
    bot.sendMessage(msg.from.id, 'Valitse toiminto.', { replyMarkup });
    return console.log("[info] Menu avattu!")
});

//Adminpaneeli
bot.on('/admin', (msg) => {
    if (msg.from.id == 81023943 || msg.from.id == 86734737) {
        console.log("[info] Admin tunnistettu")
        let replyMarkup = bot.keyboard([
            ['/adminhairio'],
            ['/hide']
        ], { resize: true });
        return bot.sendMessage(msg.from.id, `Admin menu:`, { replyMarkup })
    } else {
        console.log("[info] Adminia ei tunnistettu")
    }
});

//Häiriön lisääminen
bot.on('/adminhairio', (msg) => {
    //Jos viesti vain vain admineilta
    if (msg.from.id == 81023943 || msg.from.id == 86734737) {
        console.log("[info] Admin tunnistettu")
        //Jos hetki on Hetkinen... - lisää häiriön
        if (hetki == "Hetkinen...") {
            //Vaihtaa muuttijien viestin
            hetki = "Hetkinen...\nHäiriö voi hidastaa hakua."
            hetki2 = "Haetaan aikatauluja...\nHäiriö voi hidastaa hakua."
            //Lähettää admineille viestin
            bot.sendMessage(81023943, `Häiriö lisätty.`);
            bot.sendMessage(86734737, `Häiriö lisätty.`);
            return console.log("[info] Admin - Häiriö viesti lisätty!")
        } else {
            //Vaihtaa muuttijien viestin
            hetki = "Hetkinen..."
            hetki2 = "Haetaan aikatauluja..."
            //Lähettää admineille viestin
            bot.sendMessage(81023943, `Häiriö poistettu.`);
            bot.sendMessage(86734737, `Häiriö poistettu.`);
            return console.log("[info] Admin - Häiriö viesti poistettu!")
        }
    } else {
        console.log("[info] Adminia ei tunnistettu")
    }
});

//---------- /hae ----------
bot.on('/hae', msg => {
    let text = msg.text;

    //Jos tkesti on pelkästään /hae, ohjelma kysyy pysäkin nimeä tai koodia erikseen
    if (text == '/hae') {
        console.log("[info] Kysytty pysäkkiä.")
        return bot.sendMessage(msg.from.id, 'Anna pysäkin nimi tai koodi 😄', { replyMarkup: 'hide', ask: 'pysakkinimi' }).then(re => { })
    } else { //Muuten etsii suoraan. Heittää viestin hetkinen ja menee pysäkkihaku funktioon
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {
            //Poistaa "/hae " tekstin
            text = text.replace('/hae ', '');
            //Kutuu funktion
            pysakkihaku(msg.from.id, re.message_id, text);
        })
    }
});

//---------- /linja ----------
bot.on('/linja', msg => {
    let text = msg.text;

    //Jos saadaan vain /linja, kysytään ask linjatunnuksella linjaa
    if (text == '/linja') {
        console.log("[info] Kysytty linjaa.")
        return bot.sendMessage(msg.from.id, 'Anna linjan tunnus 😄', { replyMarkup: 'hide', ask: 'linjatunnus' }).then(re => { })
    } else { //Muuten mennään suoraan maaranpaat funktioon
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {
            //Poistaa "/linja " tekstin
            text = text.replace('/linja ', '');
            //Kutuu funktion
            maaranpaat(msg.from.id, re.message_id, text);
        })
    }
});

//---------- Kysymykset ----------

//Pysäkkinimi kysymys
bot.on('ask.pysakkinimi', msg => {
    let text = msg.text;

    //Komennot jotka ei tee pysökkihakua
    if (text == "/start" || text == undefined || text.includes("/hae") || text == "/help" || text == "/linja" || text == "/menu" || text.includes("/admin")) {
        //Keskeytetään kysymys
    } else {
        console.log("[info] Hetkinen...")
        //Lähetetään hetkinen
        return bot.sendMessage(msg.from.id, `${hetki}`).then(re => {
            //Funktioon siirtyminen
            pysakkihaku(msg.from.id, re.message_id, text);
        })
    }
});

//Pysäkkivalinta kysymys
bot.on('ask.askpysakkivalinta', msg => {
    const valinta = msg.text;

    //Komennot jotka ei tee pysökkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/linja" || valinta == "/menu" || valinta.includes("/admin")) {
        //Keskeytetään kysymys
    } else {
        //Jos sisältää "/" mennään suoraan valintafunktioon
        if (valinta.includes("/")) {

            console.log("[info] Haetaan aikatauluja...")
            return bot.sendMessage(msg.from.id, `${hetki2}`).then(re => {

                valintafunktio(msg.from.id, re.message_id, valinta);
            })
        } else { //Jos ei siällä "/" niin kysytään uudelleen
            bot.sendMessage(msg.from.id, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Ei pysäkin koodia!'));
            //Do nothing
        }
    }
});

bot.on('ask.linjatunnus', msg => {
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee hakua
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

//Pysäkkihaku - /HAE
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
            //Data on vastaus GraphQL kyselystä
            //Muutuja vastaus stringifaijattu data
            var vastaus = JSON.stringify(data);
            //Jos pysäkin nimellä ei löydy pysäkkiä
            if (vastaus == vaaravastaus) {
                //Lähettää tyhjän viestin joka tekee kysymyksen
                bot.sendMessage(chatId, ``, { ask: 'pysakkinimi' }).catch(error => console.log('[info] Pysäkkejä ei löytynyt!'));
                //Editoi viestin
                return bot.editMessageText({ chatId, messageId }, `Pysäkkiä "${viesti}" ei valitettavasti löydy.\nKokeile uudestaan 😄`, { ask: 'pysakkinimi' });
            } else {
                //Hakee pyäkit ja koodit niille
                var pysakit = jp.query(data, '$..name')
                var koodit = jp.query(data, '$..code')
                //Erittelee pysäkit ja yhdistää koodit
                for (i = 0; i < pysakit.length; i += 1) {
                    koodi = koodit[i];
                    //Yhdistää muuttujaan valinnat
                    var pk = "/" + koodi + " " + pysakit[i] + " - " + koodit[i] + "\n"
                    //Tallentaa toiseen muuttujaan kaikki pk muuttujat
                    //Jos tehdään ensinmäinen valinta
                    if (pysakkivalinta == null) {
                        //Viesti
                        pysakkivalinta = pk;
                        //Luodaan tyhjä näppäimistö
                        var nappaimisto = []
                        nappaimisto.push("/" + koodi)
                    } else {
                        //Viesti
                        pysakkivalinta = pysakkivalinta += pk;
                        //Näppäimistö
                        nappaimisto.push("/" + koodi)
                    }
                }
                //Näppäimistö jaetaan kahteen riviin
                nappaimisto2 = nappaimisto.splice(0, Math.ceil(nappaimisto.length / 2));
                //Näppäimistön alaosa
                var nappaimistoAla1 = [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')]
                var nappaimistoAla2 = ['/hide']
                //Rakennetaan nappaimisto
                let replyMarkup = bot.keyboard([nappaimisto2, nappaimisto, nappaimistoAla1, nappaimistoAla2], { resize: true });

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
        //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            return bot.editMessageText({ chatId, messageId }, `Ongelma pyynnössä. Kokeile uudestaan!`)
        })
};

//Valinta - /HAE -> /xxxx (pysäkin tunnus)
function valintafunktio(chatId, messageId, valinta) {
    //Jos pelkästään kauttaviiva
    if (valinta == '/') {
        return bot.editMessageText({ chatId, messageId }, `"/" ei ole pysäkki. Kokeile uudestaan!`, { ask: 'askpysakkivalinta' });
    }
    //Poistaa "/" merkin ja tyhjän välin
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

            //Eritellään vastaukset
            for (i = 0; i < realtimehaku.length; i += 1) {
                var stoptimesif = JSON.stringify(stoptimeshaku[i])
                var realtime = realtimehaku[i]
                //Jos ei lähtöä
                if (stoptimesif == "[]") {
                    //Do nothing
                } else {
                    //Hakee datasta nimen ja koodin
                    var pysakki = jp.query(stopshaku, '$..name')
                    var koodi = jp.query(stopshaku, '$..code')

                    //Hakee ajan ja muuttaa sen numeroksi
                    var realtimeNUM = Number(realtime)
                    //Muuntaa ajan sekunneista minuutiksi
                    var departuretime = TimeFormat.fromS(realtimeNUM, 'hh:mm');
                    //Limitoi sekunnit pois
                    var departuretimeshort = limit(departuretime, 5)
                    //Kellonaikojen korjaus
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
                    var linjatunnus = jp.query(data, '$..shortName')
                    //Hakee määränpään
                    var maaranpaa = jp.query(stopshaku, '$..headsign')
                    //Jos määränpää on tyhjä
                    if (maaranpaa[i] == null) {
                        //Älä tee mitään
                    } else {
                        //Yhdistää ajan, numeron/kirjaimen ja määränpään
                        var yksittainenlahto = departuretimeshort + "  " + linjatunnus[i] + " " + maaranpaa[i] + "\n";

                        //Yhdistää yksittäiset lähdöt viestiä varten
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                        } else {
                            lahdot = lahdot + yksittainenlahto;
                        }
                    }
                }
            }
            //Viestin lähetys
            //Jos ei lähtöjä pysäkiltä
            if (lahdot == undefined) {
                bot.sendMessage(chatId, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Ei lähtöjä.'));
                return bot.editMessageText({ chatId, messageId }, `Ei lähtöjä pysäkiltä.`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            } else { //Muuten lähettää viestin ja kysyy pysäkkivalintaa
                bot.sendMessage(chatId, ``, { ask: 'askpysakkivalinta' }).catch(error => console.log('[info] Vastaus lähetetty!'));
                return bot.editMessageText({ chatId, messageId }, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            }
        })
        //Jos errori koko höskässä konsoliin errorviesti. Valitettavasti ihan mikä vaa error on GraphQL error mut ei voi mitää
        .catch(err => {
            console.log("[ERROR] GraphQL error")
            console.log(err)
            return bot.editMessageText({ chatId, messageId }, `Ongelma valinnassa. Kokeile uudestaan!`)
        })
}

//Määränpäät - /LINJA
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
            //Datan haku kyselyn vastauksesta
            var desc = jp.query(data, '$..desc')
            var shortNames = jp.query(data, '$..shortName')
            var patterns = jp.query(data, '$..patterns')
            
            //Eritellään kaikki 
            for (i = 0; i < desc.length; i += 1) {
                //Linjatunnus ja pattterni
                var linjatunnus = shortNames[i];
                var pattern = patterns[i];

                //Vain haettu tunnus kelpaa
                if (linjatunnus == viesti) {
                    //Hakee patternista maääränpäät
                    var maaranpaat = jp.query(pattern, '$..headsign')
                    var iideeahaku = jp.query(pattern, '$..id')
                    //Jokaiselle määränpäälle
                    for (i = 0; i < maaranpaat.length; i += 1) {
                        var maaranpaa = maaranpaat[i]
                        var iidee = iideeahaku[i]
                        //Määrnänpäät siististi muuttujaan viestiä varten
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
            return bot.editMessageText({ chatId, messageId }, `Määränpäät linjalle ${linjatunnus}:\n\n${maaranpaalista}`);
        })
}

//---------- Location ----------
bot.on(['location'], (msg, self) => {
    let id = msg.from.id;
    let sijainti = msg.location;
    //Hakee erikseen lat ja lon
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
                bot.sendMessage(id, `Läheltäsi ei valitettavastai löydy pysäkkejä.`);
                return console.log("[info] Ei pysäkkejä lähellä.")
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
                        //Hakee ajan ja muuttaa sen numeroksi
                        var realtime = jp.query(stoptimes2, '$..realtimeDeparture')
                        var realtimeNUM = Number(realtime)
                        //Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var departuretime = TimeFormat.fromS(realtimeNUM, 'hh:mm');
                        //Positaa sekunnit
                        var departuretimeshort = limit(departuretime, 5)
                        //Tuntien korjaus
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
                        var shortname = jp.query(node2, '$..shortName')
                        //Hakee Määränpään
                        var headsign = jp.query(stoptimes2, '$..headsign')
                        //Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes2, '$..code')
                        //Yhdistää 
                        var yksittainenlahto = departuretimeshort + "  " + shortname + " " + headsign + " - " + pysakkikoodi + "\n";
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                        } else {
                            lahdot = lahdot + yksittainenlahto;
                        }
                    }
                }
                //Viestin lähetys
                //Jos ei lähtöjä lähellä
                if (lahdot == undefined) {
                    bot.sendMessage(msg.from.id, `Ei lähtöjä lähistöllä`);
                    return console.log("[info] Ei lähtöjä viesti lähetetty.")
                    var lahdot = undefined;
                } else { //Muuten lähettää lähdöt
                    bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${lahdot}`);
                    return console.log("[info] Location viesti lähetetty!")
                    var lahdot = undefined;
                }
            }
        })
});

//Sovelluksen pyöritys. Älä poista!!
bot.start();