const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'


//

bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${ msg.from.first_name }!`); //Vastaa kun käyttäjä käyttää /start komentoa
  });

// On every text message
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;



    return bot.sendMessage(id, `Pysäkkiä "${ text }" ei löydy xd`);
});


bot.start();



