const TeleBot = require('telebot');
const bot = new TeleBot('503339568:AAHJA_cqsBgQ3EbXXbltmdaiW0QPrsxXOpI'); //'BotToken'
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

                if (vastaus == vaaravastaus) {
                    return bot.sendMessage(id, `Pysäkkiä "${text}" ei valitettavasti löydy.`);
                } else {
                    console.log("----")
                    console.log("Vastaus: " + vastaus)
                    console.log("----")



                    // Toinen random testi



                    var jp = require('jsonpath');
                    var pysakit = jp.query(data, '$..name');
                    var koodit = jp.query(data, '$..code')
                   
                    console.log(pysakit.join(" "));
                    // pysakit.forEach(function(value){
                   
                        
                        for (i = 0; i < pysakit.length; i += 1) {
                    var pk = pysakit[i]+" "+koodit[i]
                  //     var str = pysakit.koodit.join(', ');
                       // return bot.sendMessage(str);
                       console.log(pk);
                }
                }





                //Tähän for looppi joka tekee napin jokaisesta pysäkin nimestä telegramiin

                //Keyboard (Button) test. Tätä voi käyttää hyväks siihen for looppiin...
                let replyMarkup = bot.keyboard([
                    ['/start'],
                    ['/hide']
                ], { resize: true });

                return bot.sendMessage(id, `Etsit pysäkkiä "${text}".\n${pysakit}\n${koodit}`, { replyMarkup });

            })
    }
}
)

//Viesti /hide - piilottaa keyboardin
bot.on('/hide', msg => {
    return bot.sendMessage(
        msg.from.id, 'Pysäkkivaihtoehdot piilotettu', { replyMarkup: 'hide' }
    );
});

// Logaa jokaisen viestin consoliin
bot.on('text', function (msg) {
    console.log(`[text] ${msg.chat.id} ${msg.text}`);
});

bot.start();