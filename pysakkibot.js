//Pysäkkibot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');

//BotToken
const bot = new TeleBot('BotToken');

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'
const cstart = "/start"
const chide = "/hide"
var pysakkivalinta;

//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia!\nBotti on tällä hetkellä kesken, joten toiminnallisuutta ei vielä ole.\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Koko "pääohjelma"

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
                    var pysakit = jp.query(data, '$..name');
                    var koodit = jp.query(data, '$..code')
                    //Erittelee pysäkit ja yhdistää koodit
                    for (i = 0; i < pysakit.length; i += 1) {
                        var pk = pysakit[i]+" "+koodit[i]+"\n"
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

bot.start();