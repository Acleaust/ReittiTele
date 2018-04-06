//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
var fs = require('fs');

//BotToken
const bot = new TeleBot({
    token: '503339568:AAHv3iGM75fpHHo0m8DV332JX_5PIYoU19A',
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
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").\n\nToinen tapa on lähettää sijainti ja saat lähistön seuraavat lähdöt!`); //Vastaa kun käyttäjä käyttää /start komentoa
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
        maxDistance: 300,
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
                }else{
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
                    var yksittainenlahto = departuretime+" "+numlet +" "+ headsign+" - "+pysakkikoodi+ "\n";
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
                }else{
                console.log("[info] Viesti lähetetty!")
                return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${lahdot}`);
                var lahdot = undefined;
                }
        }
        })});

//-----------------------------------------------

// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('/hae', msg => {
    let id = msg.from.id;
    let text = msg.text;

    text = text.replace('/hae ', '');

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (text == "/start" || text == "/hide" || text == "/hae") {
        //console.log("[info] /start tai /hide")
        //Älä tee mitään
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
                    return bot.sendMessage(id, `Pysäkkiä "${text}" ei valitettavasti löydy.`);
                } else {
                    //Hakee pyäkit ja koodit niille
                    var pysakit = jp.query(data, '$..name')
                    var koodit = jp.query(data, '$..code')

                    var valintanumero = 0;
                    //Erittelee pysäkit ja yhdistää koodit
                    for (i = 0; i < pysakit.length; i += 1) {

                        var pk = "/"+koodit[i]+" "+ pysakit[i] + " - " + koodit[i] + "\n"
                        //console.log(pk);
                        //Tallentaa muuttujaan pysäkit + koodit viestiä varten
                        if (pysakkivalinta == null) {
                            pysakkivalinta = pk;
                        } else {
                            pysakkivalinta = pysakkivalinta += pk;
                        }
                    }   //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                    const id = msg.from.id;
                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, {ask: 'valinta'});
                    var pysakkivalinta = undefined;
                }
            })
    }
})

//Vastaus
bot.on('ask.valinta', msg => {
    const id = msg.from.id;
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == "/hae") {
        //console.log("[info] /start tai /hide")
        //Älä tee mitään
    }else{
    valintavastaus = valinta.replace('/', '');

    const querygetstoptimesforstops = `{
        stops(name: "${valintavastaus}") {
          name
          code
            stoptimesWithoutPatterns {
            realtimeDeparture
            headsign
            }patterns{route {
              shortName
            }}
        }  
      }`

    //Hakulauseen suoritus
    return request(digiAPI, querygetlocation)
    .then(function (data) {
        var vastaus = JSON.stringify(data);

    
    
    return bot.sendMessage(id, `Valitsit pysäkin: ${ valintavastaus }`);
})}});

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Pysäkkivaihtoehdot piilotettu', { replyMarkup: 'hide' }
    );
});

//Ohjelman pyöritys. Älä poista!
bot.start();