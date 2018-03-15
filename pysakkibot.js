//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');

//BotToken
const bot = new TeleBot('503339568:AAHZmTPrp8GkTmADJopSaslyJfQvvSVgSCs');

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
const cstart = "/start"
const chide = "/hide"
var pysakkivalinta;
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const LOCvaaravastaus2 = '[]'
var lahdot;
var kellonajat;

var test;

var fs = require('fs');

//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").\n\nToinen tapa on lähettää sijainti ja saat lähistön seuraavat lähdöt!`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Koko "pääohjelma"

//Käyttäjän sijainnista
bot.on(['location'], (msg, self) => {
    let id = msg.from.id;
    let text = msg.text;
    let sijainti = msg.location;

    var latitude = jp.query(sijainti, '$..latitude')
    var longitude = jp.query(sijainti, '$..longitude')

    //Query
    const querygetlocation = `{
        places: nearest(
        lat: ${latitude},
        lon: ${longitude},
        maxDistance: 250,
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
                //Hakee datasta dataa
                var stoptimes = jp.query(data, '$..stoptimes')

                var realtimedep = jp.query(data, '$..realtimeDeparture')
                var headsign = jp.query(stoptimes, '$..headsign')
                var pNimi = jp.query(data, '$..nimi')
                var pCode = jp.query(stoptimes, '$..code')
                var pPlatform = jp.query(stoptimes, '$..platformCode')
                var bNumero = jp.query(data, '$..shortName')

                //Uus for looppi
                for (i = 0; i < stoptimes.length; i += 1) {
                    var stoptimes1 = JSON.stringify(stoptimes[i])


                    //Kirjoittaa tiedostoon stoptimesit
                    if(test == null) {
                        test = stoptimes1 + "\n";
                        fs.writeFile("test.txt", stoptimes1 + "\n") 
                    } else {
                        test = test + stoptimes1 + "\n";
                        fs.writeFile("test.txt", test + "\n")
                    }
                    
                    if (stoptimes == "[]") {
                        console.log("Hypätty yli");
                        var turhapaska = bNumero[i];
                    //Älä tee mitään for now
                    //Loppu 
                    } else {
                        var locVastaus1 = realtimedep[i]
                        
                        console.log(locVastaus1)

                        if(locVastaus1 == undefined) {
                            //Do nothing
                        } else {
                        //Muuttaa sekunnit tunneiksi ja minuuteiksi
                        var aika = TimeFormat.fromS(locVastaus1, 'hh:mm');
                        var aika2 = limit(aika, 5);
                        console.log(aika2)
                        }
                        //Yhistää ajan ja määränpään
                        var locVastaus2 = aika2+"  "+bNumero[i]+" "+headsign[i]+" - "+pCode[i]+"\n";
                        console.log("Yhdistää ajan ja määränp:  " + locVastaus2)
                        if(lahdot == null){
                            lahdot = locVastaus2;
                            console.log("Tyhjään lahtöön lisäys")
                        }else{
                            console.log("Lahtöön lisäys")
                            lahdot = lahdot + locVastaus2;
                            //console.log(lahdot)
                        } 
                    }
                }
                
                console.log("Lähettää viestin!")
                return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${lahdot}`);
                //Asettaa lahdot tyhjäksi
                var lahdot = undefined;
            }
        })
});

// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (text == cstart) {
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
                    //Erittelee pysäkit ja yhdistää koodit
                    for (i = 0; i < pysakit.length; i += 1) {
                        var pk = pysakit[i] + " " + koodit[i] + ""
                        console.log(pk);
                        //Tallentaa muuttujaan pysäkit + koodit viestiä varten
                        if (pysakkivalinta == null) {
                            pysakkivalinta = pk;
                        } else {
                            pysakkivalinta = pysakkivalinta += pk;
                        }
                    }   //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\n\n${pysakkivalinta}`, );
                    var pysakkivalinta = undefined;
                }
            })
    }
})

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Pysäkkivaihtoehdot piilotettu', { replyMarkup: 'hide' }
    );
});

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

//Ohjelman pyöritys
bot.start();