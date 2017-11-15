//All the libraries
const Beam = require('beam-client-node');
const BeamSocket = require('beam-client-node/lib/ws');
const Carina = require('carina').Carina;
const ws = require('ws');
const colors = require('colors');
const log4js = require('log4js');
const jetpack = require('fs-jetpack');
const data = jetpack.read('followers.txt');
const liveServer = require("live-server");
const fs = require('fs');
const mysql = require('mysql');
const S = require('string');
const interactive = require('beam-interactive-node2');
const rjs = require('robotjs');
const request = require('request');
const hue = require("node-hue-api")
const HueApi = require("node-hue-api").HueApi;
const Discord = require('discord.io');
const five = require("johnny-five");

//Constants
let beam = new Beam();
let newFollowers = [];
let currentPoints;
let channelId =2537409;
let channelID = '2537409';
let hhhh = 'help';
let prefix = "<@378406173814030347> ";
let userInfo;
let followArray = [];
let pointArray = [];
let currentViewers;
let client = new interactive.GameClient();
let latestFollower = followArray[24];

//Variables
var myBoard, myLed;
var info = "";
var followerList = "";
myBoard = new five.Board({repl: false});
lightState = hue.lightState;
Carina.WebSocket = ws;

//Console Input Initialize
process.stdin.resume();
process.stdin.setEncoding('utf8');

//Arduino
myBoard.on("ready", function() {

  myLed = new five.Led(8);

  myLed.on(1000);
  setTimeout(function(){
    myLed.off(1000);
  }, 3000)
});

//Discord
var bot = new Discord.Client({
    token: "Mzc4NDA2MTczODE0MDMwMzQ3.DOfwTQ.Hrg4sZFwPZJAgFYZAL8ZTt9eSG8",
    autorun: true
});


bot.on('ready', function() {
    console.log('Logged in as %s - %s\n', bot.username, bot.id);
    //bot.sendMessage({to: 277996642391818240, message: "Hi Everyone!"});
});

//Hue
var host = "192.168.0.2",
    username = "KwpeHK7Uu9RdGZW5thZ5QEwANJ9vTjbma5WKo9cU",
    api;
api = new HueApi(host, username);
off = lightState.create().off();
on = lightState.create().on();
white = lightState.create().bri(255).hue(0).sat(0);
blue = lightState.create().bri(255).xy(0.21,0.2);
red = lightState.create().bri(255).xy(0.69,0.26);
purple = lightState.create().bri(255).xy(0.3,0.07);
// --------------------------
// Using a promise
api.setLightState(3, on).done();
api.setLightState(3, white).done();
api.setLightState(5, on).done();
api.setLightState(5, white).done();

//HTTP Server Setup
var params = {
    port: 1234, // Set the server port. Defaults to 8080.
    host: "0.0.0.0", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
    root: "/Users/Austin/Random/Mixer\ Bot/HTTP", // Set root directory that's being served. Defaults to cwd.
    open: false, // When false, it won't load your browser by default.
    ignore: 'scss,my/templates', // comma-separated string for paths to ignore
    file: "index.html", // When set, serve this file for every 404 (useful for single-page applications)
    wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
    mount: [['/components', './node_modules']], // Mount a directory to a route.
    logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
    middleware: [function(req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
};

liveServer.start(params);

//MySQL
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: 'mixer'
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

//File System
function saveInfo(){
fs.writeFile("/Users/Austin/Random/Mixer Bot/HTTP/info.html", info, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("Info saved!");
}); 
};

function saveFollowers(){
fs.writeFile("/Users/Austin/Random/Mixer Bot/HTTP/followers.html", newFollowers, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("Followers saved!");
}); 
};

//Logs
log4js.configure({
  appenders: { mixer: { type: 'file', filename: 'logs/bot.log' + new Date().toUTCString() } },
  categories: { default: { appenders: ['mixer'], level: 'all' } }
});

const logger = log4js.getLogger('mixer');


//Mixer
beam.use('oauth', {
    tokens: {
        access: 'lZNSayxlEkUDcl7ILR0OmEmvLVDE935K5G3b5nDcAk1NGElOQmmNtvxTfz6v1iyN',
        expires: Date.now() + (365 * 24 * 60 * 60 * 1000)
    },
});

var displayResult = function(result) {

    console.log(JSON.stringify(result, null, 2));
};

interactive.setWebSocket(ws);

beam.request('GET', `users/current`)
    .then(response => {
        userInfo = response.body;
        return beam.chat.join(response.body.channel.id);
    })
    .then(response => {
        const body = response.body;
        return createChatSocket(userInfo.id, userInfo.channel.id, body.endpoints, body.authkey);
    })
    .catch(err => {
    if (err.res) {
        throw new Error('Error:' + err.res.body.message);
    }
});

//Request some useful info when the stream starts up such as competition.
beam.request('GET', `channels/2537409`)
    .then(res => {
        const game = res.body.type.name;
        const gameid = res.body.type.id;
        const gameViewers = res.body.type.viewersCurrent;
        const viewers = res.body.viewersTotal;
        const followers = res.body.numFollowers;
        const streamers = res.body.type.online;
        info = `There are ${gameViewers} people watching ${streamers} streamers play ${game} ${gameid} at the moment... \n At the beginning of the stream,\nyou had ${viewers} total views and ${followers} followers...`;
        saveInfo();
        logger.info(`At the beginning of the stream, you had ${viewers} total views and ${followers} followers...`);
    });


//Gets a list of all of our current and past followers to compare to. (Spam prevention)
beam.request('GET', `channels/2537409/follow?order=followed.createdAt:desc`)
    .then(res => {
    res.body.forEach(follower => followArray.unshift(follower.username));
    jetpack.write('followers.json', followArray);
    console.log(followArray[24]);
});

//Open up main socket to Mixer.
function createChatSocket (userId, channelId, endpoints, authkey) {

const hotFlash = 100;
const hotFlashCooldown = 0;

function setOBS(){
    let OBSscene = `
        <style>
        body {background-color: green;}
        h1   {  color: blue;
            font-family: courier;
            font-size: 150%;}
        p {
            width: 300px;
            padding: 10px;
            border: 5px solid gray;
            margin-top: 0;
            margin-left: -40;
            margin-bottom: 20;
            border-style: groove;
            color: black;
            background-color: white;
            font-family: courier;
            font-size: 175%;
            font-weight: bold;
            }
        p1 {
            width: 350px;
            padding: 10px;
            border: 5px solid gray;
            margin-left: -40;
            border-style: groove;
            color: white;
            background-color: #7289da;
            font-family: courier;
            font-size: 25;
            font-weight: bold;
            }
        }
        </style>
            <nav>
                <ul>
                    <p>Latest Follower: `+followArray[24]+`</p>
                    <p1>discord.gg/78wTSYA</p1>
                </ul>
            </nav>
        <head>
        <script>
            function reload(){
                location.href=location.href
            }
            setInterval('reload()',14000)
        </script>
        </head>
    `;
    fs.writeFile("/Users/Austin/Random/Mixer Bot/HTTP/scene.html", OBSscene, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("scene saved!");
})};

setOBS();


client.open({
    authToken: '5oYUUDaSjikWMQda59o2KGYwlQYPnHfqpnaTf71arI8ypUix4p5VWsOCMPiD3bcX',
    versionId: 132581,
}).then(() => {
            return client.createControls({
                controls: [{
                    "kind": "button",
                    "controlID": "1",
                    "position": [{
                        "size": "large",
                        "x": 0,
                        "y": 0,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Hot Flash!",
                    "cooldown" : hotFlashCooldown,
                    "cost": hotFlash
            },{
                    "kind": "button",
                    "controlID": "1.1",
                    "position": [{
                        "size": "medium",
                        "x": 0,
                        "y": 0,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Hot Flash",
                    "cooldown" : hotFlashCooldown,
                    "cost": hotFlash
            },{
                    "kind": "button",
                    "controlID": "1.2",
                    "position": [{
                        "size": "small",
                        "x": 0,
                        "y": 0,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Hot Flash",
                    "cooldown" : hotFlashCooldown,
                    "cost": hotFlash
            },{
                    "kind": "button",
                    "controlID": "2",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?",
            },{
                    "kind": "button",
                    "controlID": "2.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?",
            },{
                    "kind": "button",
                    "controlID": "2.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?",
            },{
                    "kind": "button",
                    "controlID": "3",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 10,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Convert sparks to points!",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "3.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 10,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Convert sparks to points!",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "3.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 10,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Convert sparks to points!",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "4",
                    "position": [{
                        "size": "large",
                        "x": 0,
                        "y": 5,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Shoutout!",
                    "cost": 5000
            },{
                    "kind": "button",
                    "controlID": "4.1",
                    "position": [{
                        "size": "medium",
                        "x": 0,
                        "y": 5,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Shoutout!",
                    "cost": 5000
            },{
                    "kind": "button",
                    "controlID": "4.2",
                    "position": [{
                        "size": "small",
                        "x": 0,
                        "y": 5,
                        "width": 10,
                        "height": 5
                    }],
                    "text": "Shoutout!",
                    "cost": 5000
            },{
                    "kind": "button",
                    "controlID": "5",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who's the latest follower?"
            },{
                    "kind": "button",
                    "controlID": "5.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who's the latest follower?"
            },{
                    "kind": "button",
                    "controlID": "5.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who's the latest follower?"
            },{
                    "kind": "button",
                    "controlID": "6",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 15,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Brag about your points!!!?",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "6.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 15,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Brag about your points!!!",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "6.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 15,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Brag about your points!!!",
                    "cost": 100
            },{
                    "kind": "button",
                    "controlID": "7",
                    "position": [{
                        "size": "large",
                        "x": 45,
                        "y": 0,
                        "width": 15,
                        "height": 5
                    }],
                    "text": "Start Russian Roulette"
            },{
                    "kind": "button",
                    "controlID": "7.1",
                    "position": [{
                        "size": "medium",
                        "x": 10,
                        "y": 0,
                        "width": 15,
                        "height": 5
                    }],
                    "text": "Start Russian Roulette"
            }    
            ],
            sceneID: "default"
        });
            
            client.state.on('participantJoin', participant => {
                // console.log(`${participant.username}(${participant.sessionID}) Joined`);
            });
            client.state.on('participantLeave', participant => {
                // Participant in this case only gives an ID string. 
                // console.log(`${participant} Left`);
            });
            client.on('error', (err) => {
                console.log('ERROR:', err);
                if(err.message !== ""){
                    renderWindow.webContents.send('error', err.message);
                }
            })
        }).then(controls => {
        controls.forEach((control) => {

        control.on('mousedown', (inputEvent, participant) => {

            console.log(`${participant.username} pushed, ${inputEvent.input.controlID}`);

            if(inputEvent.input.controlID == 1 ){
                socket.call('msg', [`/me Hot Flash!!!`]);
                api.setLightState(3, red).done();
            api.setLightState(5, red).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            }
            if(inputEvent.input.controlID == 1.1){
                socket.call('msg', [`/me Hot Flash!!!`]);
                api.setLightState(3, red).done();
            api.setLightState(5, red).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            }
            if(inputEvent.input.controlID == 1.2){
                socket.call('msg', [`/me Hot Flash!!!`]);
                api.setLightState(3, red).done();
            api.setLightState(5, red).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            }
            if(inputEvent.input.controlID == 2){
                con.query("select name, points from points where admin = 0 order by points desc limit 1", function(err, result) {
                if (err) throw err;
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": result[0].name+"\n"+result[0].points}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?"}], sceneID: "default"});
            }, 6000);
            });
            }
            if(inputEvent.input.controlID == 2.1){
                con.query("select name, points from points where admin = 0 order by points desc limit 1", function(err, result) {
                if (err) throw err;
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": result[0].name+"\n"+result[0].points}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?"}], sceneID: "default"});
            }, 6000);
            })};
                if(inputEvent.input.controlID == 2.2){
                con.query("select name, points from points where admin = 0 order by points desc limit 1", function(err, result) {
                if (err) throw err;
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": result[0].name+"\n"+result[0].points}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "2.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 0,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who has the most points?"}], sceneID: "default"});
            }, 6000);
            })}
            if(inputEvent.input.controlID == 3 ){
                socket.call('whisper', [`${participant.username}`, `/me You gained 200 points!!!`]);
                con.query("UPDATE points SET points = points + 200 WHERE name = '" + participant.username + "'");
            }
            if(inputEvent.input.controlID == 3.1){
                socket.call('whisper', [`${participant.username}`, `/me You gained 200 points!!!`]);
                con.query("UPDATE points SET points = points + 200 WHERE name = '" + participant.username + "'");
            }
            if(inputEvent.input.controlID == 3.2){
                socket.call('whisper', [`${participant.username}`, `/me You gained 200 points!!!`]);
                con.query("UPDATE points SET points = points + 200 WHERE name = '" + participant.username + "'");
            }
            if(inputEvent.input.controlID == 4 ){
                socket.call('msg', [participant.username +` thought it would be a great idea to spend 5000 sparks on a shoutout so here: `+participant.username]);
            }
            if(inputEvent.input.controlID == 4.1){
                socket.call('msg', [participant.username +` thought it would be a great idea to spend 5000 sparks on a shoutout so here: `+participant.username]);
            }
            if(inputEvent.input.controlID == 4.2){
                socket.call('msg', [participant.username +` thought it would be a great idea to spend 5000 sparks on a shoutout so here: `+participant.username]);
            }
            if(inputEvent.input.controlID == 5){
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": followArray[24]}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5",
                    "position": [{
                        "size": "large",
                        "x": 60,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who is the latest Follower?"}], sceneID: "default"});
            }, 6000);
            }
            if(inputEvent.input.controlID == 5.1){
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": followArray[24]}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5.1",
                    "position": [{
                        "size": "medium",
                        "x": 25,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who is the latest Follower?"}], sceneID: "default"});
            }, 6000);
            }
            if(inputEvent.input.controlID == 5.2){
                client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": followArray[24]}], sceneID: "default"});
                setTimeout(function(){
            client.updateControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "5.2",
                    "position": [{
                        "size": "small",
                        "x": 10,
                        "y": 5,
                        "width": 20,
                        "height": 5
                    }],
                    "text": "Who is the latest Follower?"}], sceneID: "default"});
            }, 6000);
            }
            if(inputEvent.input.controlID == 6){
                con.query("SELECT points FROM points WHERE name LIKE '" + participant.username + "'", function(err, result) {
                if (err) throw err;
                socket.call('msg', [`/me `+participant.username +` has `+result[0].points+` points! Can you beat that? `]);
            })}
            if(inputEvent.input.controlID == 6.1){
                con.query("SELECT points FROM points WHERE name LIKE '" + participant.username + "'", function(err, result) {
                if (err) throw err;
                socket.call('msg', [`/me `+participant.username +` has `+result[0].points+` points! Can you beat that? `]);
            })}
            if(inputEvent.input.controlID == 6.2){
                con.query("SELECT points FROM points WHERE name LIKE '" + participant.username + "'", function(err, result) {
                if (err) throw err;
                socket.call('msg', [`/me `+participant.username +` has `+result[0].points+` points! Can you beat that? `]);
            })}
                if(inputEvent.input.controlID == 7){
                con.query("select name, points from points where admin = 0 order by points desc limit 1", function(err, result) {
                if (err) throw err;
                client.deleteControls({
                    controlIDs: ["7"], sceneID: "default"});
                setTimeout(function(){
            client.createControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "7",
                    "position": [{
                        "size": "large",
                        "x": 45,
                        "y": 0,
                        "width": 15,
                        "height": 5
                    }],
                    "text": "Start Russian Roulette"}], sceneID: "default"});
            }, 60000);
            });
            }
            if(inputEvent.input.controlID == 7.1){
                con.query("select name, points from points where admin = 0 order by points desc limit 1", function(err, result) {
                if (err) throw err;
                client.deleteControls({
                    controlIDs: ["7.1"], sceneID: "default"});
                setTimeout(function(){
            client.createControls({
                    controls: [{
                    "kind": "button",
                    "controlID": "7.1",
                    "position": [{
                        "size": "medium",
                        "x": 10,
                        "y": 0,
                        "width": 15,
                        "height": 5
                    }],
                    "text": "Start Russian Roulette"}], sceneID: "default"});
            }, 60000);
            })};
            
            // Did this push involve a spark cost?
            if (inputEvent.transactionID) {

                // Unless you capture the transaction the sparks are not deducted.
                client.captureTransaction(inputEvent.transactionID)
                .then(() => {
                    console.log(`Charged ${participant.username} ${control.cost} sparks!`);
                });
            }
        });
    });
});
client.on('open', () => console.log('Connected to interactive'));

    // Chat connections
    const socket = new BeamSocket(endpoints).boot();
    const ca = new Carina({ isBot: true }).open();
    let rrStart = false;
    let rrArray = [];

    //Actions to execute when a user joins the channel.
    socket.on('UserJoin', data => {
        beam.request('GET', `channels/${data.username}`)
            .then(res => {
                const spark = res.body.user.sparks;
                const joinMessage = data.username + ' has joined.' + " Sparks: " + spark;
        socket.call('whisper', [`${data.username}`, `Hi ${data.username}! Welcome to our stream!`]);
        console.log(joinMessage.green );
        logger.info(joinMessage);
        pointArray.push(data.username);

        con.query('SELECT name FROM points WHERE name LIKE ?', [data.username], function(err, result) {
    if (err) throw err;
    if (result.length === 0){
        con.query("INSERT INTO points (name, points, followed, admin) VALUES ('" + data.username + "', 100, 0, 0); ");
        }
    if (result.length > 0){   
    };
  });
        });
    });

    //Actions to execute when a user leaves the channel.
    socket.on('UserLeave', data => {
        beam.request('GET', `channels/2537409`)
            .then(res => {
                const joinMessage = data.username + ' has left.';
                const currentViewers = res.body.viewersCurrent;
                console.log(joinMessage.red + " Viewers:" + currentViewers);
                logger.info(joinMessage);
                let pos = pointArray.indexOf(data.username);
                pointArray.splice(pos, 1);
        });
    });

    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function rrGame(){
        let players = rrArray.length - 1;
        let winningAmount = rrArray.length * 100;
        let winningNumber = randomBetween(0, players);
        let winner = rrArray[winningNumber];
        con.query("UPDATE points SET points = points + " + winningAmount + " WHERE name = '" + winner + "'");
    };

    //Actions to execute when a chat message is created.
    socket.on('ChatMessage', data => {
        const lastMessage = data.id;
        con.query("UPDATE points SET points = points + 0 WHERE name = '" + data.user_name + "'");      
        console.log(data.user_name.gray +': '.gray + data.message.message[0].data.gray);
        logger.info(data.user_name +': ' + data.message.message[0].data);
        
        //!secrets
        if (data.message.message[0].data.toLowerCase().startsWith('!4962347')) {
            socket.call("deleteMessage", [lastMessage]);
            con.query("UPDATE points SET points = points + 1000 WHERE name = '" + data.user_name + "'");
        }
        if (data.message.message[0].data.toLowerCase().startsWith('!123456789')) {
            socket.call("deleteMessage", [lastMessage]);
            con.query("UPDATE points SET points = points - 1000 WHERE name = '" + data.user_name + "'");
        }

        //!array
        if (data.message.message[0].data.toLowerCase().startsWith('!array')) {
            socket.call("deleteMessage", [lastMessage]);
            console.log(pointArray);
        }

        //!discord
        if (data.message.message[0].data.toLowerCase().startsWith('!discord')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `https://discord.gg/78wTSYA`]);
            console.log(`Told ${data.user_name} how to join discord.`.grey);
            logger.info('Told how to join discord: ' + data.user_name);
        }

        //!extralife
        if (data.message.message[0].data.toLowerCase().startsWith('!extralife')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `https://www.extra-life.org/participant/sodabros`]);
            console.log(`Told ${data.user_name} how to donate to extra life.`.grey);
            logger.info('Told how to donate to extra life: ' + data.user_name);
        }

        //!find
        if (data.message.message[0].data.toLowerCase().startsWith('!find')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `Go to the Community tab on the Xbox Dashboard, then head over to 'Clubs on Xbox'. Once there, Search our club at the top of the screen under 'Find a Club'.`]);
            console.log(`Told ${data.user_name} how to find the club.`.grey);
            logger.info('Told how to find the club: ' + data.user_name);
        }

        //!game
		if (data.message.message[0].data.toLowerCase().startsWith('!game')) {
            socket.call("deleteMessage", [lastMessage]);
            beam.request('GET', `channels/2537409`)
            .then(res => {
            let game = res.body.type.name;
            socket.call('whisper', [`${data.user_name}`, `We are currently playing ${game}!`]);
        });
        }

        //!join
        if (data.message.message[0].data.toLowerCase().startsWith('!join')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `Donors take preference when we invite people. We invite people through our Xbox Club 'SodaBros'. If you do not know how to find clubs on Xbox, run the command !find.`]);
            console.log(`Told ${data.user_name} how to join.`.grey);
            logger.info('Told how to join: ' + data.user_name);
        }

        //!loots
        if (data.message.message[0].data.toLowerCase().startsWith('!loots')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `https://loots.com/en/tip-jars/hobbyists`]);
            console.log(`Told ${data.user_name} the loots URL`.gray);
            logger.info('Loots URL displayed to: ' + data.user_name);
        }

        //minecraft
        if (data.message.message[0].data.toLowerCase().startsWith('!minecraft')) {
            socket.call("deleteMessage", [lastMessage]);
            let lengthMessage = data.message.message[0].data.toLowerCase().length;
            let minecraftName = data.message.message[0].data.toLowerCase().slice(11, lengthMessage);
            socket.call('whisper', [`${data.user_name}`, "You set your Minecraft Username as: " + minecraftName]);

            con.query("SELECT name FROM points WHERE name = '" + data.user_name + "'", function(err, result) {
                if (err) throw err;
                if (result.length === 0){
        con.query("INSERT INTO points(name, minecraft) VALUES ( '" + data.user_name + "', '" + minecraftName + "')");
        console.log('1');
                };
                if (result.length > 0){
                    con.query("UPDATE points SET minecraft = '" + minecraftName + "' WHERE name = '" + data.user_name + "'");
                    console.log('2');
                };
            });

        }
        
        //!patreon
        if (data.message.message[0].data.toLowerCase().startsWith('!patreon')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `https://patreon.com/hobbyists`]);
            console.log(`Told ${data.user_name} how to donate.`.grey);
            logger.info('Told how to donate: ' + data.user_name);
        }

        //!ping
        if (data.message.message[0].data.toLowerCase().startsWith('!ping')) {
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `PONG!`]);
            api.setLightState(3, blue).done();
            api.setLightState(5, blue).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            console.log(`Ponged ${data.user_name}`.gray);
            logger.info('Ponged: ' + data.user_name);
        }

        //!points
        if (data.message.message[0].data.toLowerCase().startsWith('!points')) {
            socket.call("deleteMessage", [lastMessage]);
            con.query("SELECT points FROM points WHERE name LIKE '" + data.user_name + "'", function(err, result) {
        
            if (result.length > 0){
                console.log(result[0].points);
                currentPoints = result[0].points;
                socket.call('whisper', [`${data.user_name}`, "Points: " + currentPoints]);
            }});
            console.log(`Told points to ${data.user_name}`.gray);
            logger.info('Points Grabbed: ' + data.user_name);
        }

        //gamble
        if (data.message.message[0].data.toLowerCase().startsWith('!gamble')) {
            socket.call("deleteMessage", [lastMessage]);
            let lengthMessage = data.message.message[0].data.toLowerCase().length;
            let number = data.message.message[0].data.toLowerCase().slice(7, lengthMessage);
            socket.call('whisper', [`${data.user_name}`, "Gambled: " + number]);

        }

        //!roulette
        if (data.message.message[0].data.toLowerCase().startsWith('!rr')) {
            socket.call("deleteMessage", [lastMessage]);
            

                 con.query("SELECT points FROM points WHERE name LIKE '" + data.user_name + "'", function(err, result) {
        
            if (result.length > 0){
                console.log(result[0].points);
                currentPoints = result[0].points;
                if (currentPoints < 100){
                    socket.call('whisper', [`${data.user_name}`, "You do not have enough points to play: " + currentPoints]);
                }
                if (currentPoints >= 100){
            if (rrStart === false){
                socket.call('msg', [`A game of Russian Roulette has been started! (100 points to play. Type !rr to join.)`]);
                rrStart = true;
                setTimeout(() => {
                socket.call('msg', [`30 seconds left to join Russian Roulette!!!`]);
            }, 30000);
                setTimeout(() => {
                socket.call('msg', [`Spinning the chamber...`]);
            }, 55000);
            setTimeout(() => {
                let players = rrArray.length - 1;
                let winningAmount = rrArray.length * 100;
                let winningNumber = randomBetween(0, players);
                let winner = rrArray[winningNumber];
                con.query("UPDATE points SET points = points + " + winningAmount + " WHERE name = '" + winner + "'");
                socket.call('msg', [`${winner} is the only one who survived. Oh the sadness. I guess he gets all ${winningAmount} points.`]);
                rrStart = false;
                rrArray = [];
            }, 60000);
            }
            if (rrStart === true){
                if (rrArray.indexOf(data.user_name) < 0){
                    con.query("UPDATE points SET points = points - 100 WHERE name = '" + data.user_name + "'");
                socket.call('msg', [`${data.user_name} has joined Russian Roulette. Good Luck!`]);
                rrArray.push(data.user_name); 
                }
                if (rrArray.indexOf(data.user_name) >= 0){
               
                }
                
            }}
            }});

        }

        //!start
        if (data.message.message[0].data.toLowerCase().startsWith('!start stream')) {
            socket.call("deleteMessage", [lastMessage]);
    	beam.request('PATCH', `channels/2537409`, {body:{online: true}})
		.then(res => {
        console.log(`Started Stream.`.green);
    	});
        }
        
        //!sparks
        if (data.message.message[0].data.toLowerCase().startsWith('!sparks')) {
            beam.request('GET', `channels/${data.user_name}`)
            .then(res => {
            const spark = res.body.user.sparks;
            socket.call("deleteMessage", [lastMessage]);
            socket.call('whisper', [`${data.user_name}`, `You have ${spark} sparks!`]);
            console.log(`Told ${data.user_name} how to many sparks they have: ${spark}.`.grey);
        });
        }

        //!stop stream
		if (data.message.message[0].data.toLowerCase().startsWith('!stop stream')) {
            socket.call("deleteMessage", [lastMessage]);
            beam.request('PATCH', `channels/2537409`, {body:{online: false}})
		.then(res => {
        console.log(`Stopping Stream.`.red);
    	});
        }

        //!update
        if (data.message.message[0].data.toLowerCase().startsWith('!update')) {
            socket.call("deleteMessage", [lastMessage]);
            beam.request('GET', `channels/2537409`)
            .then(res => {
            const game = res.body.type.name;
            const gameViewers = res.body.type.viewersCurrent;
            const viewers = res.body.viewersTotal;
            const followers = res.body.numFollowers;
            const streamers = res.body.type.online;
            console.log(`There are ${gameViewers} people watching ${streamers} streamers play ${game} at the moment...`.cyan);
        });
        }
    });

    //Actions to execute on follow or unfollow.
    ca.subscribe(`channel:2537409:followed`, data => {
        const followUnfollow = data.following;
        
        if(followUnfollow === true){
            console.log(data.user.username.magenta + ' has followed!'.magenta);
            newFollowers.unshift(data.user.username);
            logger.info('Followed: ' + data.user_name);
            con.query('SELECT followed FROM points WHERE name LIKE ?', [data.user.username], function(err, result) {
    if (result[0].followed === 0){
        api.setLightState(3, blue).done();
            api.setLightState(5, blue).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            socket.call('msg', [`/me Thank you for the follow `+data.user.username+`!!!`]);
            latestFollower = data.user.username;
            setOBS();
    };
    if (result[0].followed === 1){
         console.log("They have followed before.".red); 
    };
    });
            con.query('SELECT name FROM points WHERE name LIKE ?', [data.user.username], function(err, result) {
    if (err) throw err;
    if (result.length === 0){
    };
    if (result.length > 0){
         con.query("UPDATE points set followed = 1 where name='" + data.user.username + "'"); 
    };
    });
            saveFollowers();
        }

        if(followUnfollow === false){
            console.log(data.user.username.red + ' has unfollowed :('.red)
            var pos = newFollowers.indexOf(data.user.username);
            newFollowers.splice(pos, 1);
            logger.info('Unfollowed: ' + data.user_name);
            saveFollowers();
        }
    });

    //Actions to execute on host.
    ca.subscribe(`channel:2537409:hosted`, data => {
        const userHostedUs = data.hoster.token;
        api.setLightState(3, purple).done();
            api.setLightState(5, purple).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
            socket.call('msg', [`/me Thank you for the host `+userHostedUs+`!!!`]);
            console.log("User: "+userHostedUs+", Partners: "+data.hoster.partnered+", Views: "+data.hoster.viewersTotal+", Viewers: "+data.hoster.viewersCurrent+", Followers: "+data.hoster.numFollowers);
    });

//Discord Bot

function buttons(state){
    if(state == true){
        client.ready(true);
    }if(state == false){
        client.ready(false);
    }
}


bot.on('message', function(user, userID, channelID, message, event) {
    let text = message.toLowerCase();
if (text.includes(prefix) == true) {
    if (text.includes("hey") == true) {
        bot.sendMessage({to: channelID, message: "Hi "+user+"!"});
    }
    if (text.includes("hi") == true) {
        bot.sendMessage({to: channelID, message: "Hi "+user+"!"});
    }
    if (text.includes("hello") == true) {
        bot.sendMessage({to: channelID, message: "Hi "+user+"!"});
    }
    if (text.includes("ping") == true) {
        bot.sendMessage({to: channelID, message: ":ping_pong: Pong!"});
    }
    if (text.includes("what's up") == true) {
        bot.sendMessage({to: channelID, message: "Not much."});
    }
    if (text.includes("whats up") == true) {
        bot.sendMessage({to: channelID, message: "Not much."});
    }
    if (text.includes("stream") == true) {
        if (text.includes("online") == true) {
            beam.request('GET', `channels/2537409`)
            .then(res => {
            const online = res.body.online;
                if(online == true){
                    bot.sendMessage({to: channelID, message: "We are streaming right now!"});
                }if(online == false){
                    bot.sendMessage({to: channelID, message: "We are currently offline at the moment."});
                }
            });
        }
        if (text.includes("views") == true) {
            beam.request('GET', `channels/2537409`)
            .then(res => {
            const views = res.body.viewersTotal;
                bot.sendMessage({to: channelID, message: "We have "+views+" total channel views!"});
            });
        }
        if (text.includes("followers") == true) {
            beam.request('GET', `channels/2537409`)
            .then(res => {
            const views = res.body.numFollowers;
                bot.sendMessage({to: channelID, message: "We have "+views+" total followers!"});
            });
        }
        if (text.includes("viewers") == true) {
            beam.request('GET', `channels/2537409`)
            .then(res => {
            const online = res.body.online;
            const viewers = res.body.viewersCurrent;
                if(online == true){
                    bot.sendMessage({to: channelID, message: "We have "+viewers+" people watching at the moment."});
                }if(online == false){
                    bot.sendMessage({to: channelID, message: "We are currently offline at the moment."});
                }
            });
        }
    }
}

});

    let currentlyOffline = true;

 process.stdin.on('data', function (text) {
    text = text.replace(/\n$/, '');
    //console.log('received data:', util.inspect(text));
    if(text == "blue"){
        api.setLightState(3, blue).done();
            api.setLightState(5, blue).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
    }
    if(text == "clear"){
    }
    if(text == "on"){
        buttons(true);
        bot.sendMessage({to: 277996642391818240, message: "@everyone We just started the stream! Come join!"});
    }
    if(text == "off"){
        socket.call("clearMessages");
        buttons(false);
        bot.sendMessage({to: 277996642391818240, message: "@everyone We just ended the stream! Come join us next time!"});
    }
    if(text == "teston"){
        buttons(true);
    }
    if(text == "testoff"){
        socket.call("clearMessages");
        buttons(false);
        
    }
    if(text == "purple"){
        api.setLightState(3, purple).done();
            api.setLightState(5, purple).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            }, 3000);
    }
    if(text == "red"){
        myLed.on(1000)
        api.setLightState(3, red).done();
            api.setLightState(5, red).done();
            setTimeout(function(){
            api.setLightState(3, white).done();
            api.setLightState(5, white).done();
            myLed.off(1000);
            }, 3000);
            
    }
    if (text === 'quit') {
      //bot.sendMessage({to: 277996642391818240, message: "Bye All!"});
      setTimeout(function(){
        process.exit();
            }, 1000);
      
    }
  });

    //Our continious timed messages.
    setInterval(() => {
           for (i = pointArray.length; i > 0; i--) { 
            let user = pointArray[i-1];
            console.log(user); 
        con.query("UPDATE points SET points = points + 100 WHERE name = '" + user + "'");
        }
            console.log('points added');
            }, 600000);
    /*setInterval(() => {
            socket.call('msg', [`Every week we choose a different member of our discord channel and allow them to hang out with us during stream on discord without having to be a donor! To join our Discord channel just type !discord`]);
            console.log('MOTW message.');
            }, 1700000);
    setInterval(() => {
            socket.call('msg', [`Check out our Patreon page by !patreon! If you want to support us for free, just run the command !loots to create a custom message to see onscreen!`]);
            console.log('Support message.');
            }, 1200000);*/
    //Handle errors
    socket.on('error', error => {
            console.error('Socket error', error);
            logger.error('Socket Error', error);
    });

    //Proof of bot joining the channel.
    return socket.auth(channelId, userId, authkey)
        .then(() => {
            console.log('Login successful'.yellow);
            logger.info('The bot has successfully connected to the channel!');
    });
}