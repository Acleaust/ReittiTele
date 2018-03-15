//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');

//BotToken
const bot = new TeleBot('503339568:AAHyyBN1dQz-T58-6QcT4hJA8cgyPFAZDZg');

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
const cstart = "/start"
const chide = "/hide"
var pysakkivalinta;
const LOCvaaravastaus = '{"places":{"edges":[]}}'
const LOCvaaravastaus2 = '[[]]'
var lahdot;
var kellonajat;

//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").\n\nToinen tapa on lähettää sijainti ja saat lähistön seuraavat lähdöt!`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Koko "pääohjelma"

//Käyttäjän sijainnista
bot.on(['location', 'contact'], (msg, self) => {
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
        }else{
            //Hakee datasta dataa
            var stoptimes = jp.query(data, '$..stoptimes')

            var realtimedep = jp.query(data, '$..realtimeDeparture')
            var headsign = jp.query(stoptimes, '$..headsign')
            var pNimi = jp.query(data, '$..nimi')
            var pCode = jp.query(stoptimes, '$..code')
            var pPlatform = jp.query(stoptimes, '$..platformCode')
            var bNumero = jp.query(data, '$..shortName')
           
            //Tekee kaikkee kivaa :)
            for (i = 0; i < realtimedep.length; i += 1) {
                var locVastaus1 = realtimedep[i];
                var stoptimes1 = stoptimes[i]
                //Muuttaa sekunnit tunneiksi ja minuuteiksi
                var aika = TimeFormat.fromS(locVastaus1, 'hh:mm');
                var aika2 = limit(aika, 5)

                if (stoptimes1 == LOCvaaravastaus2) {
                    console.log("Hypätty yli")
                    //Älä tee mitään for now
                }else{
                    //Yhistää ajan ja määränpään
                var locVastaus2 = aika2+"  "+bNumero[i]+" "+headsign[i]+" - "+pCode[i]+"\n";

                //Yhdistää monta vastausta
                if(lahdot == null){
                    lahdot = locVastaus2;
                }else{
                    lahdot = lahdot += locVastaus2;
                }
                }
        
            }

            return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n\n${ lahdot }`);
            var lahdot = undefined;
}
})});

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
                }else{
                    //Hakee pyäkit ja koodit niille
                    var pysakit = jp.query(data, '$..name')
                    var koodit = jp.query(data, '$..code')
                    //Erittelee pysäkit ja yhdistää koodit
                    for (i = 0; i < pysakit.length; i += 1) {
                        var pk = pysakit[i]+" "+koodit[i]+""
                        console.log(pk);
                        //Tallentaa muuttujaan pysäkit + koodit viestiä varten
                        if(pysakkivalinta == null){
                            pysakkivalinta = pk;
                        }else{
                            pysakkivalinta = pysakkivalinta += pk;
                        }
                    }   //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                        return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\n\n${pysakkivalinta}`,);
                        var pysakkivalinta = undefined;
                    }})}})

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