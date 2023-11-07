const express = require('express'),
      app = express(),
      router = express.Router();
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const config = require('./config.json');
const port = config.SERVER_PORT; 
const bodyParser = require('body-parser');

const sqlite3 = require("sqlite3");
const database_filepath = "./users.db";
const db = new sqlite3.Database(database_filepath);
const DEBUG = config.DEBUG;
const crypto = require('./Encryption/crypto');
const key = Buffer.from("oUHqJ9IOlyjA4edqmyFdkeNi8J/x+dte2AWlGRd2uTM=",'base64');
let session_ivs = new Map();
var admin_session;
app.set("view engine","jade")

let Commands = new Map();
const fs = require("fs");
function ImportCommands() {
    const commandFiles = fs.readdirSync('./Commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./Commands/${file}`);
        Commands.set(command.name, command);
        console.log(`Imported ${file}...`)
    }
}
ImportCommands();

const validate_session = function(req,res,next)
{
    let iv = session_ivs.get(req.body.iv);
    if(iv && (req.headers.authorization === config.public_token))
    {
        session_ivs.delete(req.body.iv);
        if ((new Date()-iv)/1000 < 30) //Checks if IV is less than 30 seconds old
        {
            next();
            return;
        };
    }
    res.send({"res":"Invalid Session"});
     
}
router.post("/post",validate_session,async(req,res)=>{
    console.log(req.body);
    if(!DEBUG)req.body = await crypto.decryptBody(req.body,key,req.body.iv); //decrypt the JSON Object request
    console.log(req.body);
    req.body.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const command = Commands.get(req.body.command);
    let resObj = {"status":"200"};
    if(!command.adminOnly)
        resObj.res = await command.execute(db,req.body,resObj);
    else 
        resObj.res = "You do not have access to this command";
    if(!DEBUG)resObj = await crypto.encryptResponse(resObj,key,req.body.iv); //encrypt the JSON Object response
    resObj["token"] = req.body.token;
    res.send(resObj);
});

//
// reset hardwareid for admin-panel 
//
router.post('/resethwid', async(req,res)=> {
    console.log('resethwid');
    console.log(req.body);

    session=req.session;
    if(session && session.userid){
    }
    else{
        res.render('login', {title: 'Admin-Login Page'});
        return;
    }


    admin_command = {
        command: "resethwid", 
        username: req.body.username,
        password: ""
    };

    const Database = Commands.get('resethwid');
    var response = await Database.execute(db,admin_command,res,true);
    //res.send(response);
    res.redirect('/adminpanel');
});
//
// delete user for admin-panel 
//
router.post('/deluser', async(req,res)=> {
    console.log('deluser');
    console.log(req.body);

    session=req.session;
    if(session && session.userid){
    }
    else{
        res.render('login', {title: 'Admin-Login Page'});
        return;
    }


    admin_command = {
        command: "delete", 
        username: req.body.username
    };

    const Database = Commands.get('delete');
    var response = await Database.execute(db,admin_command,res,true);
    //res.send(response);
    res.redirect('/adminpanel');
});

//
// genearte license for admin-panel 
//
router.post('/genkey', async(req,res)=> {
    console.log('post genkey');
    console.log(req.body);
    session=req.session;
    if(session && session.userid){
    }
    else{
        res.render('login', {title: 'Admin-Login Page'});
        return;
    }

    switch(parseInt(req.body.licensetype))
    {
    case 1: 
        license_period =2;  
        license_comment = '2hours';
        break;
    case 2: 
        license_period =24;  
        license_comment = '1day';
        break;
    case 3: 
        license_period =24*7;  
        license_comment = '7days';
        break;
    case 4: 
        license_period =24*30;  
        license_comment = '30days';
        break;
    case 5:
        license_period =24*30*1000;  
        license_comment = 'Permanant';
        break;
    default:
        license_period =0;  
        license_comment = 'other';
        break;
    }
    console.log(license_period);
    console.log(license_comment);
   
    admin_command = {
        command: "generate", 
        length: license_period, 
        rank: license_comment, 
        quantity: req.body.quantity};

    var response_all = "<a href=\'/adminpanel'>Go back</a><br>";
    for (var i = 0; i < req.body.quantity; i++) {
        const Database = Commands.get(admin_command.command);
        var response = await Database.execute(db,admin_command,res,true);
        response_all += response;
        response_all += "<br>";
    }
    
    res.send(response_all);
});
//
// admin login for admin-panel 
//
router.post("/adminlogin",async(req,res)=>{
    console.log('post adminlogin');
    if(req.body.username == config.admin_username && req.body.password == config.admin_password){
        session=req.session;
        session.userid=req.body.username;
        console.log(req.session)
        //res.send(`Hey there, welcome <a href=\'/logout'>click to logout</a>`);

        res.redirect('/adminpanel');
    }
    else{
        //res.send('Invalid username or password');
        //res.send('Invalid username or password');
        res.redirect('/adminpanel');
    }
});
//
// admin logout for admin-panel 
//
router.get("/adminlogout",async(req,res)=>{
    req.session.destroy();
    res.redirect('/adminpanel');
});
//
// show information for admin-panel 
//
router.get('/adminpanel', async(req,res)=> {
    console.log('get adminpanel');
    session=req.session;
    console.log(session);
    if(session && session.userid){

    }
    else{
        res.render('login', {title: 'Admin-Login Page'});
        return;
    }
    //res.render('sample');
    var response;
    console.log(req.query);
    if(req.query.filter == '' || req.query.filter == undefined)
    {
        console.log('show all');
        const Database = Commands.get("show");
        response = await Database.execute(db,req.body,res,true);
        res.render('adminpanel', { 
                title:          'Admin-Panel',
                accountlist:    response});
    }
    else
    {
        console.log('find member', req.query.filter);
        var filter_content = {entry: req.query.filter};
        const Database = Commands.get("find");    
        response = await Database.execute(db,filter_content,res,true);
        console.log(response);
        if(response)
        {
            res.render('adminpanel', { 
                title:          'Admin-Panel',
                accountlist:    [response]});
        }
        else
        {
            res.render('adminpanel', { 
                title:          'Admin-Panel',
                accountlist:    []});
        }       
    }    
});

router.post("/admin",async(req,res)=>{
    if(config.auth === req.headers.authorization)
    {       
        const Database = Commands.get(req.body.command);
        var response = await Database.execute(db,req.body,res,true);
        res.send(response);
    }else{
        res.send("Access Denied");
    }
});

app.get("/initialize",async(req,res)=>{
    let iv = crypto.generateIV();
    console.log("Generated: " + iv);
    res.send(iv);
    session_ivs.set(iv,new Date());
})


app.get('/download', function(req, res) {
    res.sendFile(config.PATCH_FILE);
});
app.get("/launcher",async(req,res)=>{
    res.sendFile(config.LAUCHER_FILE);
});
app.get("/version",async(req,res)=>{
    res.send(config.LAUNCHER_VERSION);
});

const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "2032807FF67F0000E8FDE0D5FBC230BE",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies 
app.use(cookieParser());
app.use('/',router);
app.listen(port, ()=>{console.log(`Listening on port ${port}`)});