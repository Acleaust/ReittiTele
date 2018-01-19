const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'
const { request } = require('graphql-request')

// vareja


//Komentoja
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${ msg.from.first_name }! Tervetuloa käyttämään pysäkkibottia! Botti on tällä hetkellä work in progress joten toiminnallisuus on mitä on.`); //Vastaa kun käyttäjä käyttää /start komentoa
  });

//Koko muu höskä \/

// Etsii jokaisesta viestistä pysäkin nimeä
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    var vastaus;

    const query = `{
	stops(name: "${ text }") {
        id
        name
        }
    }`
    
    request('http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', query)

    .then(data => console.log(data))
    .then(data => vastaus = data)
    .then(() => console.log(vastaus))

    return bot.sendMessage(id, `Etsit pysäkkiä "${ text }". ${vastaus}`);

})


// Logaa jokaisen viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${ msg.chat.id } ${ msg.text }`);
});

bot.start();
