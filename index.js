const TeleBot = require('telebot');
const bot = new TeleBot('503339568:AAG2TQSzCCnSaxhZrRbO08rUo8dRtjmbmT0'); //'BotToken'
const { request } = require('graphql-request')


//Muuttujat
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const vaaravastaus = '{"stops":[]}'


//Komentoja
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään pysäkkibottia! Botti on tällä hetkellä work in progress joten toiminnallisuus on mitä on. Voit aloittaa käytön kirjoittamalla pysäkin nimen tai sen koodin (esim: E4017).`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Koko muu höskä
// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    // /start ei tee pysäkkihakua
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
                    return bot.sendMessage(id, `Etsit pysäkkiä "${text}". Vastaus: ${vastaus}`);

                    //Tähän for looppi joka tekee napin jokaisesta vastauksesta
                    for(var attributename in query){
                       
                        console.log(attributename+": "+query[attributename]);
                        button( attributename+": "+query[attributename])
                    }
            }
        })           
    }
})

// Logaa jokaisen viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

bot.start();