const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'
const { request } = require('graphql-request')


// variablet
const digiAPI = 'http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';


//Komentoja
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${ msg.from.first_name }! Tervetuloa käyttämään pysäkkibottia! Botti on tällä hetkellä work in progress joten toiminnallisuus on mitä on.`); //Vastaa kun käyttäjä käyttää /start komentoa
  });

//Koko muu höskä
// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    //Jos vastaus on tyhjä
    var vastaus = "null";

    //Hakulause
    const query = `{
	stops(name: "${ text }") {
        id
        name
        }
    }`

    //Hakulauseen suoritus
    return request(digiAPI, query) 
    //Then
    .then(function(data) {
        console.log(data)
        var json = JSON.stringify(data);
        return bot.sendMessage(id, `Etsit pysäkkiä "${ text }". Vastaus: ${json}`);
    })

    //Jos vastaus tyhjä ifelse //Atm ei tee mitää
    if(vastaus == "null") {
        return bot.sendMessage(id, `Etsit pysäkkiä "${ text }". Vastaus ei toimi. :(`);
    }else{
        return bot.sendMessage(id, `Etsit pysäkkiä "${ text }". Vastaus: ${json}`);
    }

})

// Logaa jokaisen viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${ msg.chat.id } ${ msg.text }`);
});

bot.start();
