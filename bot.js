const logger = require('winston');
const Discord = require('discord.js');
const gm = require('gm');
var {prefix, token} = require('./auth.json');

const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const url = "https://u.gg/lol/champions/";
const icon_suffix = ".png";
const champ_thumb = "http://ddragon.leagueoflegends.com/cdn/img/champion/loading/";

const role_top = "/build?role=top";
const role_jungle = "/build?role=jungle";
const role_middle = "/build?role=middle";
const role_adc = "/build?role=adc";
const role_supp = "/build?role=support";


var {data} = require('./item.json');
var runes = require('./runes.json');
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
    else if(message.channel.name == "builds" && message.content.startsWith("!build ")){
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
    if(fs.existsSync(path_role)){
        champBuild = require(`./ChampionBuild/${champBuild.id}_${champBuild.role}.json`);
        console.log(champBuild);
        console.log("AQUI");
        createMsg(channel, champBuild);
        return;
    }
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
    if(!(fs.existsSync(path_build)) && !(fs.existsSync(path_role))){
        getPage( (html) => {
            console.log("None of the files exist, parsing");
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
    champBuild.runes = runesName(builds["rec_runes"]);
    champBuild.skill_path = skill_path(builds["rec_skill_path"]);
    champBuild.url = `${url}${champBuild.name}${role_url}`;
    champBuild.image = `${champions[champBuild.id].thumbnail_url}`;
    console.log(champBuild);
}
function createMsg(channel, champBuild){
    let main_str = '', sub_str = '',
        file_name = `${champBuild.id}_${champBuild.role}.png`,
        file = `./${file_name}`;
    for(i in champBuild.runes.main_perks){
       console.log(champBuild.runes.main_perks[i].name);
       main_str += `${champBuild.runes.main_perks[i].name}\n`;
    }
    for(ii in champBuild.runes.sub_perks){
        sub_str += `${champBuild.runes.sub_perks[ii].name}\n`;       
        console.log(champBuild.runes.sub_perks[ii].name);
    }
    try{
        runes_img(champBuild, file);
    }catch(err){
        console.log("Erro na criacao da imagem");
        console.log(err);
    }
    finally{
        let msg;
        try{
            msg = new Discord.RichEmbed()
                .setColor('#0099ff')
                .setTitle(`${champBuild.name} Build`)
                .setThumbnail(champBuild.image)
                .setURL(`${champBuild.url}`)
                .setAuthor(`U.GG`)
                .addField(`**Starting Items**`, champBuild.item1, true)
                .addField(`**Core Items**`, champBuild.item2, true)
                .addField(`**Option 1**`, champBuild.item3, true)
                .addField(`**Option 2**`, champBuild.item4, true)
                .addField(`**Option 3**`, champBuild.item5, true)
                .addBlankField()
                .addField(`**Skill Path**`, champBuild.skill_path, true)
                .addBlankField()
                .addField(`**${champBuild.runes.main}**`, main_str ,true)
                .addField(`**${champBuild.runes.sub}**`, sub_str ,true)
                .attachFile(file)
                .setImage(`attachment://${file_name}`);
        }catch(err){
            console.log("Erro na criacao da msg");
            console.log(err);
        }
        finally{
            channel.send(msg);
                console.log(msg);
        }
    }
}
function itemName(build, x){
    let outputStr = "";
    if(x){
        build.forEach(function(item){
            outputStr +=
                (data[item].name);
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
function runesName(builds){
    let runas = new Object;
    runas.main = runes[builds.primary_style].name;
    runas.main_id = builds.primary_style;
    runas.sub = runes[builds.sub_style].name;
    runas.sub_id = builds.sub_style;
    runas.main_perks = new Array();
    runas.sub_perks = new Array();

    for(key in runes){
        if(key == runas.main_id){
            for(r in runes[key].slots){
                for(rec in builds.active_perks){
                    if(runes[key].slots[r].runes[builds.active_perks[rec]] != undefined){
                        let tmp_rune = new Object;
                        tmp_rune.name = runes[key].slots[r].runes[builds.active_perks[rec]].name;
                        tmp_rune.key  = runes[key].slots[r].runes[builds.active_perks[rec]].key;
                        tmp_rune.icon  = runes[key].slots[r].runes[builds.active_perks[rec]].icon;
                        runas.main_perks.push(tmp_rune);
                        console.log(runas.main_perks);
                    }
                }
            }
        }
        else if(key == runas.sub_id){
            for(r in runes[key].slots){
                for(rec in builds.active_perks){
                    if(runes[key].slots[r].runes[builds.active_perks[rec]] != undefined){
                        let tmp_rune = new Object;
                         tmp_rune.name = runes[key].slots[r].runes[builds.active_perks[rec]].name;
                        tmp_rune.key  = runes[key].slots[r].runes[builds.active_perks[rec]].key;
                        tmp_rune.icon =runes[key].slots[r].runes[builds.active_perks[rec]].icon;
                        runas.sub_perks.push(tmp_rune);
                        console.log(runas.sub_perks);
                    }
                }
            }
        }
    }
    return runas;
};
function skill_path(rec){
    let skill_path = '';
    for(var i=0; i < rec.items.length; i++){
        (i % 5 == 0 || i == 0) ? skill_path += ` **${rec.items[i]}** ` : skill_path += ` ${rec.items[i]} `;
        (i != (rec.items.length-1)) ? skill_path += `=>` : skill_path += ` `;
    }
    return skill_path;
}
function runes_img(build, file_name){
    
    let main = build.runes.main_perks,
        sub  = build.runes.sub_perks,
        prefix_path = "./runes/";

    console.log("Starting");
    gm()
        .in('-page', '+0+0')
        .in(prefix_path + main[0].icon)
        .in('-page', '+32+128')
        .in(prefix_path + main[1].icon)
        .in('-page', '+32+192')
        .in(prefix_path + main[2].icon)
        .in('-page', '+32+256')
        .in(prefix_path + main[3].icon)
        .in('-page', '+128+128')
        .in(prefix_path + sub[0].icon)
        .in('-page', '+128+192')
        .in(prefix_path + sub[1].icon)
        .background('transparent')
        .mosaic()
        .write(file_name, function(err){
            if(err) console.log(err);
            else if(!err){
                return 1;
            }
        });
}
