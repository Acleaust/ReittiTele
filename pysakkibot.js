//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var fs = require('fs');

//BotToken
const bot = new TeleBot({
    token: 'token',
    usePlugins: ['askUser']
});
//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
var pysakkivalinta;
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const LOCvaaravastaus2 = '[]'
//const stopvaaravastaus = '{"stoptimesWithoutPatterns": []}'
var lahdot;
var kellonajat;
var test;


//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});
//-----------------------------------------------

//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai sen koodin (esim: "/hae Keilaniemi" tai "/hae E4017").\n\nVoit myös lähettää sijainnin ja saat lähistöltä seuraavat lähdöt!`); //Vastaa kun käyttäjä käyttää /start komentoa
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
        maxDistance: 350,
        filterByPlaceTypes: DEPARTURE_ROW,
        ) {
            edges {
              node {
                distance
                place{
                  id
                  __typename
                  ... on DepartureRow {
                  stoptimes (numberOfDepartures: 1) {
                  pickupType
                  realtimeDeparture
                  headsign
                  stop {
                      name
                      code
                      platformCode
                  }
                  }pattern{
                    route{
                      shortName
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

                        //Hakee linjan numeron tai kirjaimen
                        var numlet = jp.query(node2, '$..shortName')
                        //Hakee Määränpään
                        var headsign = jp.query(stoptimes2, '$..headsign')
                        //Hakee pysäkin
                        var pysakkikoodi = jp.query(stoptimes2, '$..code')

                        //Konsoliin kaikki
                        //console.log(JSON.stringify(departuretime+"  "+numlet +" "+ headsign+" - "+pysakkikoodi))
                        var yksittainenlahto = departuretime + " " + numlet + " " + headsign + " - " + pysakkikoodi + "\n";
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
                    console.log("[info] Ei lähtöjä.")
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

// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('/hae', msg => {
    let id = msg.from.id;
    let text = msg.text;

    text = text.replace('/hae ', '');

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (text == "/start" || text == "/hide") {
        //console.log("[info] /start tai /hide")
        //Älä tee mitään
    } else {
        if (text == "/hae") {
            return bot.sendMessage(id, `Voit etsiä pysäkkejä kirjoittamalla /hae ja pysäkin nimi tai koodi samaan viestiin`)
        }else{
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
                    }   //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                    const id = msg.from.id;
                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'valinta' });
                    var pysakkivalinta = undefined;
                }
            })
    }}
})
//-----------Vastaus edelliseen------------------
//Vastaus
bot.on('ask.valinta', msg => {
    const id = msg.from.id;
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == "/hae") {
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
                        console.log("Hypätty yli")
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
                            console.log("[debug] Null skip")
                        }else{
                        //Yhdistys
                        var yksittainenlahto = departuretimeshort + "  " + numlet[i] + " " + headsingif + "\n";
                        
                        if (lahdot == null) {
                            lahdot = yksittainenlahto;
                            //console.log("Tyhjään lahtöön lisäys")
                        } else {
                            //console.log("Lahtöön lisäys")
                            lahdot = lahdot + yksittainenlahto;
                            //console.log(lahdot)
                        }}
                    }
                }
                if (lahdot == undefined) {
                    console.log("[info] Ei lähtöjä.")
                    return bot.sendMessage(msg.from.id, `Ei lähtöjä pysäkiltä.`);
                    var lahdot = undefined;
                } else {
                    console.log("[info] Viesti lähetetty!")
                    return bot.sendMessage(msg.from.id, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`);
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

//Ohjelman pyöritys. Älä poista!
bot.start();