const logger = require('winston');
const Discord = require('discord.js');
const doAsync = require('doasync');
var {prefix, token} = require('./auth.json');

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const url = "https://u.gg/lol/champions/";
const url_icon = "http://ddragon.leagueoflegends.com/cdn/9.13.1/img/item/";
const icon_suffix = ".png";
const champ_thumb = "http://ddragon.leagueoflegends.com/cdn/img/champion/loading/";

const role_top = "/build?role=top";
const role_jungle = "/build?role=jungle";
const role_middle = "/build?role=middle";
const role_adc = "/build?role=adc";
const role_supp = "/build?role=support";


var {data} = require('./item.json');
var tmp_champ = require('./champions.json');
const champions = tmp_champ.data;

let champBuild = new Object;
var champ, builds, role_url;

var top = "world_overall_top";
var jungle = "world_overall_jungle";
var mid = "world_overall_mid";
var adc = "world_overall_top";
var supp = "world_overall_supp";


// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

const client = new Discord.Client();
client.once('ready', () => {
    console.log('Ready!');
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(client.username + ' - (' + client.id + ')');

});
client.login(token);
client.on('message', message => {
    if(message.author.bot) return;
    if(message.channel.name != "builds") return;
    else if(message.channel.name == "builds" && message.content.startsWith("!build")){
        const args = message.content.split(' ');
        const author = message.member;
        console.log(args);
        console.log(message.member.id + message.author + message.content);

        champBuild.id = args[1].toLowerCase();
        champBuild.role = roles(args[2]);
        if((champBuild.role == null || champions[args[1]] == undefined) && (message.member.id == "283317804244140043")){
                message.channel.send("Vai pro caralho galrito");
                return;
        }
        if(champBuild.role == null){
            message.channel.send("Lane/role desconhecida");
            return;
        }
        if(champions[args[1]] == undefined){
            message.channel.send("Champion desconhecido");
        }
        champBuild.name = champions[champBuild.id].id;
        sendBuild(message.channel);
    }
});
function roles(r){
    switch(r){
    case("top"):
        role_url = role_top;
        return top;
        break;
    case("jungle"):
        role_url = role_jungle;
        return jungle;
        break;
    case("mid"):
    case("middle"):
        role_url = role_middle;
        return mid;
        break;
    case("bot"):
    case("adc"):
        role_url = role_adc;
        return adc;
        break;
    case("supp"):
    case("support"):
        role_url = role_supp;
        return supp;
        break;
    default:
        return null;
    }
}
const getPage = ( cb ) => {
     request(`${url}${champBuild.id}/build/?role`, {
         timeout: 3000
     }, (error, response, body) => {
         if(!error){
             cb(body);
         }
     } );
 };

 const parsePage = ( data ) => {
     const $ = cheerio.load(data);
     let output = $("#ssr-preloaded-state").html();
     return output.substring(output.indexOf("{"));
 };
function sendBuild(channel){
    let build, path_build, path_role;
    path_build = `./Champion/${champBuild.id}.json`;
    path_role = `./ChampionBuild/${champBuild.id}_${champBuild.role}.json`;

    //Verification if
    /*fs.access(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`, fs.constants.F_OK, (err) => {
      console.log(`Clasula do role ./ChampionBuild/${champBuild.id}_${champBuild.role}.json ${err ? 'does not exist' : 'exists' }`);
      if(!err){ */
    if(fs.existsSync(path_role)){
        champBuild = require(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`);
        console.log(champBuild);
        console.log("AQUI");
        createMsg(channel, champBuild);
        return;
    }
    //});
    /*
    fs.access(`./Champion/${champBuild.id}.json`, fs.constants.F_OK, (err) => {
        console.log(`Clasula do role ./Champion/${champBuild.id}.json ${err ? 'does not exist' : 'exists' }`);
        if(!err){ */
    if(fs.existsSync(path_build)){
            build = require(`./Champion/${champBuild.id}.json`);
            builds = build[champBuild.role];
            createBuild(builds);
            fs.writeFile(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`, JSON.stringify(champBuild), 'utf8', function(err){
                if(err) throw err;
            });
            createMsg(channel, champBuild);
            return;
    }
    /*});
    fs.access(`./Champion/${champBuild.id}.json`, fs.constants.F_OK, (err) => {
        console.log(`./Champion/${champBuild.id}.json ${err ? 'does not exist' : 'exists' }`);
        if(!err){ */
    if(!(fs.existsSync(path_build)) && !(fs.existsSync(path_role))){
/*        fs.access(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`, fs.constants.F_OK, (err) => {
            console.log(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json ${err ? 'does not exist' : 'exists' }`);
                if(!err){ */
                    getPage( (html) => {
                        console.log("parsing");
                        champ = JSON.parse(parsePage(html));
                        build = champ.championProfile.championOverview[1];
                        fs.writeFile(`./Champion/${champBuild.id}.json`, JSON.stringify(build), 'utf8', function(err){
                            if(err) throw err;
                        });
                        builds = build[champBuild.role];
                        createBuild(builds);
                        fs.writeFile(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`, JSON.stringify(champBuild), 'utf8', function(err){
                            if(err) throw err;
                        });
                        createMsg(channel, champBuild);
                    });
                }
}
function createBuild(builds){
    champBuild.item1 = itemName(builds["rec_starting_items"].items, 1);
    champBuild.item2 = itemName(builds["rec_core_items"].items, 1);
    champBuild.item3 = itemName(builds["item_options_1"], 0);
    champBuild.item4 = itemName(builds["item_options_2"], 0);
    champBuild.item5 = itemName(builds["item_options_3"], 0);
    champBuild.url = `${url}${champBuild.name}${role_url}`;
    champBuild.image = `${champions[champBuild.id].thumbnail_url}`;
}
function createMsg(channel, champBuild){
    const msg = new Discord.RichEmbed()
          .setColor('#0099ff')
          .setTitle(`${champBuild.name} Build`)
          .setImage(champBuild.image)
          .setURL(`${champBuild.url}`)
          .setAuthor(`U.GG`)
          .addField(`Starting Items`, champBuild.item1, true)
          .addField(`Core Items`, champBuild.item2, true)
          .addBlankField()
          .addField(`Option 1`, champBuild.item3, true)
          .addField(`Option 2`, champBuild.item4, true)
          .addField(`Option 3`, champBuild.item5, true);
    channel.send(msg);
    console.log(msg);
}
function itemName(build, x){
    let outputStr = "";
    if(x){
        build.forEach(function(item){
            outputStr += (data[item].name);
             outputStr += "\n";
         });
     }else if(!x){
         build.forEach(function(item){
             outputStr += (data[item.item_id].name);
             outputStr += "\n";
         });
     }
     return outputStr;
 };












