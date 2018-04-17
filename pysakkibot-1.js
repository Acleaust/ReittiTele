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

//---------- Komentoja ----------
bot.on('/start', (msg) => {
    console.log("[info] Start viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\n\nVoit aloittaa käytön kirjoittamalla /hae ja pysäkin nimen tai koodin.\n\nVoit vaihtoehtoisesti myös lähettää sijaintisi ja saada lähistöltäsi seuraavat lähdöt!\n\nJos tarvitset lisää apua tee /help! 😄`); //Vastaa kun käyttäjä käyttää /start komentoa
});

bot.on('/help', (msg) => {
    console.log("[info] Help viesti lähetetty!")
    return bot.sendMessage(msg.from.id, `${msg.from.first_name} tarvitsetko apua? Tässä lisäohjeita:\n\nVoi etsiä pysäkkejä kirjoittamalla "/hae" ja pysäkin nimen.\nEsim. "/hae keilaniemi"\n\nVoit myös lähettää sijaintisi ja saadä lähistöltä lähdöt. Jos lähelläsi ei ole pysäkkejä, kokeile lähettää sijainti pysäkin läheltä.\n\nToivottavasti pääset jatkamaan näillä ohjeilla! 😊`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//---------- Pääohjelma ----------

//---------- /hae ----------

bot.on(['/hae'], msg => {
    let text = msg.text;

    if (text == '/hae') {
        console.log("[info] Kysytty pysäkkiä.")
        return bot.sendMessage(msg.from.id, 'Anna pysäkin nimi tai koodi 😄', { ask: 'pysakkinimi' }).then(re => { })
    } else {

        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, 'Hetkinen...').then(re => {

            //Poistaa komennon (gi == case sensitive) idk tosi paska menetelmä tehä tää mut toimii
            text = text.replace('/hae ', '');
            text = text.replace('/', '')
            text = text.replace(/hae /gi, "")
            text = text.replace(/hae/gi, "")

            //Kutuu funktion
            pysakkihaku(msg.from.id, re.result.message_id, text);
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
                console.log("[info] Viesti lähetetty! (Pysäkkejä ei löytynyt)")
                return bot.editMessageText({ chatId, messageId }, `Pysäkkiä "${viesti}" ei valitettavasti löydy.`);
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
                //console.log("[info] Valinnat lähetetty!")
                bot.sendMessage(chatId, ``,{ ask: 'askpysakkivalinta' } ).catch(error => console.log('[info] Valinnat lähetetty!'));
                return bot.editMessageText({ chatId, messageId }, `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'askpysakkivalinta' })
                //return bot.sendMessage(chatId , `Etsit pysäkkiä "${viesti}".\nValitse alla olevista vaihtoehdoita oikea pysäkki!\n\n${pysakkivalinta}`, { ask: 'askpysakkivalinta' })
                var pysakkivalinta = undefined;
            }
        })
};

function valintafunktio(chatId, messageId, valinta) {
    //Poistaa "/" merkin
    valintavastaus = valinta.replace('/', '');
    //Query
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
                return bot.editMessageText({ chatId, messageId }, `Ei lähtöjä pysäkiltä.`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            } else {
                //console.log("[info] Vastaus lähetetty!")
                //bot.sendMessage(chatId, ``,{ ask: 'askpysakkivalinta' } ).catch(error => console.log('[info] Vastaus lähetetty!'));
                return bot.editMessageText({ chatId, messageId }, `Lähdöt pysäkiltä ${pysakki} - ${koodi}:\n\n${lahdot}`, { ask: 'askpysakkivalinta' });
                var lahdot = undefined;
            }
        })
}

//---------- Minifunktiot ----------


//---------- Kysymykset ----------

bot.on('ask.pysakkinimi', msg => {
    let text = msg.text;

    if (text == "/start" || text == "/hide" || text == undefined || text.includes("/hae") || text == "/help" || text == "/linja") {
        //Älä tee mitään
    } else {
        console.log("[info] Hetkinen...")
        return bot.sendMessage(msg.from.id, 'Hetkinen...').then(re => {

            pysakkihaku(msg.from.id, re.result.message_id, text);
        })
    }
});

bot.on('ask.askpysakkivalinta', msg => {
    const valinta = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (valinta == "/start" || valinta == "/hide" || valinta == undefined || valinta.includes("/hae") || valinta == "/help" || valinta == "/linja") {
        //console.log("[info] /start tai /hide")
        //Älä tee mitään
    } else {
        console.log("[info] Haetaan aikatauluja...")
        return bot.sendMessage(msg.from.id, 'Haetaan aikatauluja...').then(re => {

            valintafunktio(msg.from.id, re.result.message_id, valinta);
        })
    }
});





//---------- Muut komennot ----------

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