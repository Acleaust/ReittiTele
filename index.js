const TeleBot = require('telebot');
const bot = new TeleBot('BotToken'); //'BotToken'
require('isomorphic-fetch');

//

bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${ msg.from.first_name }!`); //Vastaa kun käyttäjä käyttää /start komentoa
  });

// On every text message
bot.on('text', msg => {
    let id = msg.from.id;
    let text = msg.text;

    fetch('http://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `{
            stops(name: "${ text }") {
                id
                name
            }
          }` }),
      })
        .then(res => res.json())
        .then(res => console.log(res.data));

    return bot.sendMessage(id, `Pysäkkiä "${ text }" ei löydy xd`);

});

bot.start();
