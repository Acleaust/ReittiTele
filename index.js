const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'
const { request } = require('graphql-request')

//

bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${ msg.from.first_name }!`); //Vastaa kun käyttäjä käyttää /start komentoa
  });

// On every text message
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    const query = `{
        stops(name: "${ text }") {
            id
            name
            wheelchairBoarding
        }
      }`
        
      request('http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', query).then(data => console.log(data))
    
      if(){
        
      }

    return bot.sendMessage(id, `Pysäkkiä "${ text }" ei löydy xd`);

});


bot.start();



