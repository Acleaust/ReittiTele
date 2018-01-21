const TeleBot = require('telebot');
const bot = new TeleBot('503339568:AAG2TQSzCCnSaxhZrRbO08rUo8dRtjmbmT0'); //'BotToken'
const { request } = require('graphql-request')

//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'


//Komentoja
bot.on('/start', (msg) => {
return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia! Botti on tällä hetkellä kesken, joten toiminnallisuutta ei vielä ole.\n\nVoit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: "Keilaniemi" tai "E4017").`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Koko muu höskä
// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    // Tähän komennot joita jotka ei tee pysäkkihakua
    if (text == "/start") {
        //Älä tee mitään
    } else {

        //Hakulause
        const query = `{
	    stops(name: "${text}") {
        name
        code
        }
        }`

        //Hakulauseen suoritus
        return request(digiAPI, query)
            //Then
            .then(function (data) {
                console.log(data)
                var vastaus = JSON.stringify(data);

                if(vastaus == vaaravastaus) {
                    return bot.sendMessage(id, `Pysäkkiä "${text}" ei valitettavasti löydy.`);
                }else{
                    console.log("----")
                    console.log("Vastaus: " + vastaus)
                    console.log("----")

                    /* Tää oli joku random testi pidän sen täs jos sitä voi käytää hyväks
                    for(stops in data) {
                        var vastaus = JSON.stringify(data[stops])
                        console.log(vastaus)
                    }
                    */
                    /* Toinen random testi
                    for(name in data) {
                        console.log(JSON.stringify(data[name]))
                    }*/

                    //Tähän for looppi joka tekee napin jokaisesta pysäkin nimestä telegramiin

                    //Keyboard (Button) test. Tätä voi käyttää hyväks siihen for looppiin...
                    let replyMarkup = bot.keyboard([
                        ['/start'],
                        ['/hide']
                    ], {resize: true});

                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\n${vastaus}`, {replyMarkup} );
                    
            }
        })           
    }
})

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Pysäkkivaihtoehdot piilotettu', {replyMarkup: 'hide'}
    );
});

// Logaa jokaisen viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

bot.start();