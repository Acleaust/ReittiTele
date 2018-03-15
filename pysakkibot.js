//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')

//BotToken
const bot = new TeleBot('421446760:AAHVNT3llWsGwbS9lCIFs1LLnJ1NZCyy3SE');

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
const cstart = "/start"
const chide = "/hide"
var pysakkivalinta;
const LOCvaaravastaus = '{"places":{"edges":[]}}'
var lahdot;
var kellonajat;

//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").\n\nToinen tapa on lähettää sijainti ja saat lähistön seuraavat lähdöt!`); //Vastaa kun käyttäjä käyttää /start komentoa
});

var aika = TimeFormat.fromS(49663, 'hh:mm:ss') 
console.log(aika)

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
        maxDistance: 100,
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
            var realtimedep = jp.query(data, '$..realtimeDeparture')
            var headsign = jp.query(data, '$..headsign')
            var pNimi = jp.query(data, '$..nimi')
            var pCode = jp.query(data, '$..code')
            var pPlatform = jp.query(data, '$..platformCode')

            //Tekee kaikkee kivaa :)
            for (i = 0; i < realtimedep.length; i += 1) {
                var locVastaus1 = realtimedep[i];
                //Muuttaa sekunnit tunneiksi ja minuuteiksi
                var aika = TimeFormat.fromS(locVastaus1, 'hh:mm') ;
                //Yhistää ajan ja määränpään
                var locVastaus2 = aika+" "+headsign[i]+" "+pCode[i]+"\n"

                //Yhdistää monta vastausta
                if(lahdot == null){
                    lahdot = locVastaus2;
                }else{
                    lahdot = lahdot += locVastaus2;
                }
            }
            return bot.sendMessage(msg.from.id, `Lähdöt lähelläsi:\n${ lahdot }`);
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
                        } else {
                            pysakkivalinta = pysakkivalinta += pk;

                        }
                    }   //Returnaa pysäkit tekstinä ja tyhjentää pysäkkivalinnan
                        return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\n\n${pysakkivalinta}`,);
                        var pysakkivalinta = undefined;
                    }})}})

                    bot.on('/1', msg => {
                        return bot.sendMessage(
                            msg.from.id, 'Mäkkylä',
                        );
                    });
                    bot.on('/2', msg => {
                        return bot.sendMessage(
                            msg.from.id,'Bäkkylä' , 
                        );
                    });
                    bot.on('/3', msg => {
                        return bot.sendMessage(
                            msg.from.id, 'Pysäkkivaihtoehdot piilotettu', 
                    });



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