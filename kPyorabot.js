//Kaupunkipyöräbot
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');

//BotToken
const bot = new TeleBot('BotToken');

//Muuttujat


//Komennot
bot.on('/start', (msg) => {
    return bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Tervetuloa käyttämään Kaupunkipyöräbottia!\nOlen vielä kesken, mutta valmistun pian!\n\n`); //Vastaa kun käyttäjä käyttää /start komentoa
});

//Botti pysyy päällä
bot.start();