//
//  Pysäkkibot
//  Created by @AInkilainen (Telegram username)
//

//NPM
const TeleBot = require('telebot');
const { request } = require('graphql-request')
var jp = require('jsonpath');
var TimeFormat = require('hh-mm-ss')
var limit = require('limit-string-length');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('data.json')
const dbjson = low(adapter)
require('console-stamp')(console, 'HH:MM:ss'); //Aikaleimat logiin

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser', 'floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 0.8,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

//-----------------------------------------------

// Logaa jokaisen sisääntulevan viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

// databasen defaultit
dbjson.defaults({ users: [] })
    .write()

//-----------------------------------------------

// /start
bot.on('/start', (msg) => {
    let replyMarkup = bot.keyboard([
        [bot.button('/hae'), bot.button('location', 'Sijaintisi mukaan 📍')],
    ], { resize: true });
    bot.sendMessage(msg.from.id, `Hei, ${msg.from.first_name}! Saat tästä lähtien poikkeusinfot suoraan tänne chättiin tai jotain sen kaltas... ei kukaan tiiä mut joo oletetaan että x = -6. Ratkaise joonaksen koneen 3DMark score y`, { replyMarkup }); //Vastaa kun käyttäjä käyttää /start komentoa
    return console.log("[info] Start viesti lähetetty!")
});

//Sovelluksen pyöritys. Älä poista!!
bot.start();