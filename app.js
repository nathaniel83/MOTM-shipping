/**============== MOTM MAIN SERVER FILE ================
*
*  David Ashley - davidashley.io
*  Description:
*  Web application for package shipment tracking. Routes handle
*  logic of tracking number upload to database, transfer of tracking data 
*  to OSM Worldwide via SFTP, request of OSM/USPS package tracking API for 
*  customer tracking event display, and user registration and authorization.
*
========================================================**/
//IMPORTS
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var db = require("./config/db");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const cors = require('cors');
const passport = require("passport");
const path = require('path');
var request = require('request');//For API request
const fileUpload = require('express-fileupload');//req.body for files
const createCsvWriter = require('csv-writer').createObjectCsvWriter;//Writes JSON to CSV
const Client = require('ssh2').Client;//SFTP Library
const csv=require('csvtojson');//Parses CSV to JSON


//Libray/Module/Security Config
app.use(fileUpload());
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use( bodyParser.json({limit: '50mb'}) );
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.static(__dirname+'/public'));
app.use(passport.initialize());
app.use(passport.session());

//Database Connection
db.connect(function(error){
    if(error){
        console.log('error connecting db: '+error)
    }else{
        console.log('Connected to database');
    }
});

//====== BEGIN GET/POST ROUTES ======

app.get("/",function(req,res,next){
    res.render("home",{msg:null});
});

app.get("/customer",function(req,res,next){
    res.render("customer",{data:null,msg:null});
});

app.get("/ftpTest",function(req,res,next){
    res.render("ftpTest");
});

app.get("/inventory",function(req,res,next){

    filename = "MOTM0906.csv"
    csvNumbers = [123,623,365,506,360,647,658,446,347,265,274,507,697,657,586,492,383,347];
    packagesCounted = 28;

    theData = {
        file:filename,
        numbers:csvNumbers,
        quantity:packagesCounted
    }



    res.render("inventory",{data:theData});
});

//Used strictly as an isolated SFTP Test
/**
app.post("/ftpTest",function(req,res,next){
    console.log("post route hit");
 
    var conn = new Client();
    conn.on('ready', function(){
    console.log('Client :: ready');
    conn.sftp(function(err, sftp) {
        if (err) throw err;
        sftp.fastPut('./dataFolder/ftpData.csv','./MANIFEST/data.csv', function(err) {
            if (err) throw err;
            console.log("no error")
            conn.end();
            })
        });
    }).connect({
        host: 'sftp.osmworldwide.us',
        port: 22,
        username: 'mailsftp2018move',
        password: '^9735kf;X*_*z'
        });

    res.render("ftpTest")
})
 */

/** Upload route grabs csv file from body, stores it locally on the server, 
*   parses file to JSON, JSON data is saved to database. New CSV file is then built
*   from JSON data that is formatted for SFTP transfer. Once file is built, SFTP sends
*   new CSV to OSM Worldwide.
*   Function Order: 
*    initialParse() --> buildFile() --> sendFTP()
*/
app.post("/upload",function(req,res,next){
   console.log("upload route");
   console.log(req.files.thefile.name);
   //Save File
   let csvFile = req.files.thefile;
   let user = req.body.theuser;
   let token = req.body.thetoken;
   let filename = req.body.filename;
   //Stores CSV locally
   csvFile.mv('./dataFolder/data.csv', function(err) {
        if (err){
            console.log("there is an error: " +err)
        }else{
            console.log("File uploaded!");
        }
    });
    //Builds new CSV
    function buildFile(theData){
        console.log("Hit function");
        var entryArray = [];
        console.log(JSON.stringify(theData).substring(0,140));
        const fields = ['Package Id','Company','Full Name','Address 1','Address 2','City','State','Zip','Country','Cost Center','Reference 1','Reference 2','Reference 3','Reference 4','Weight']

        for(var i = 0;i<theData.length;i++){
            //This is OSM requested format
            var theItem = {
                "Package Id":theData[i]["I"],
                "Company":"",
                "Full Name":theData[i]["M"],
                "Address 1":theData[i]["O"],
                "Address 2":theData[i]["P"],
                "City":theData[i]["S"],
                "State":theData[i]["T"],
                "Zip":theData[i]["U"],
                "Country":theData[i]["W"],
                "Cost Center":"",
                "Reference 1":"",
                "Reference 2":"",
                "Reference 3":"",
                "Reference 4":"",
                "Weight":theData[i]["A"]
            }
            entryArray.push(theItem);
        }

        const csvWriter = createCsvWriter({
            path: './dataFolder/ftpData.csv',
            //File Format for CSV writer
            header: [
                {id: 'Package Id', title: 'Package Id'},
                {id: 'Company', title: 'Company'},
                {id: 'Full Name', title: 'Full Name'},
                {id: 'Address 1', title: 'Address 1'},
                {id: 'Address 2', title: 'Address 2'},
                {id: 'City', title: 'City'},
                {id: 'State', title: 'State'},
                {id: 'Zip', title: 'Zip'},
                {id: 'Country', title: 'Country'},
                {id: 'Cost Center Id', title: 'Cost Center Id'},
                {id: 'Reference 1', title: 'Reference 1'},
                {id: 'Reference 2', title: 'Reference 2'},
                {id: 'Reference 3', title: 'Reference 3'},
                {id: 'Reference 4', title: 'Reference 4'},
                {id: 'Weight', title: 'Weight'}
            ]
        });
        var promise1 = csvWriter.writeRecords(entryArray)
            .then(()=>{
                console.log("...Done");
            });

        Promise.all([promise1]).then(()=>{
            sendFTP();
        });  
    }
    //Sends newly constructed CSV to OSM via SFTP
    function sendFTP(){
        var fileString = "./MANIFEST/MOTM" + filename.substring(filename.length-8,filename.length-4) + Date.now() + ".csv";
        console.log("post route hit");
        console.log("the new file name: "+fileString)
 
 
        var conn = new Client();
        conn.on('ready', function() {
            console.log('Client :: ready');
            conn.sftp(function(err, sftp) {
                if (err) throw err;
                sftp.fastPut('./dataFolder/ftpData.csv',fileString, function(err) {
                    if (err) throw err;
                    console.log("no error")
                    conn.end();
                });
            });
        }).connect({
            host: 'sftp.osmworldwide.us',
            port: 22,
            username: 'mailsftp2018move',
            password: '^9735kf;X*_*z'
        });
    }

   
    //Converts uploaded CSV to JSON
    function initialParse(){
      return new Promise(function(resolve,reject){
        const csvFilePath='./dataFolder/data.csv';
        csv({noheader: true,headers: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK']})
        .fromFile(csvFilePath)
            .then((jsonObj)=>{
                console.log(JSON.stringify(jsonObj).substring(0,100));
                db.storeTrackingData(jsonObj,user,filename,(err,result)=>{
                    if(err){
                        console.log("store tracking err: "+err)
                        res.render("upload",{msg:"There was an error uploading the file."})
                    }else{
                        console.log("Success: ");
                        resolve(jsonObj);
                        
                    }
                });
            });
        });
    }   

    initialParse().then((data,err)=>{
        if(err){
            console.log(err)
        }else{
            buildFile(data)
        }
    }); 
    res.render("upload",{msg:"Successfully uploaded the file!",user:user,token:token});
});


app.get("/register",function(req,res,next){
    res.render("register",{msg:null});
    
});

app.post("/register",function(req,res,next){
    if(req.body.password!=req.body.passwordconfirm){
        console.log("passwords don't match")
        res.render("register",{msg:"Passwords do not match! Try again."});
        return;
    }
    let newUser = {
        username:req.body.username,
        password:req.body.password,
        
    }
    console.log(newUser)
    //PASSWORD ENCRYPT AND DATABASE INSERT--IN config/db.js
    db.passwordHash(newUser,(err)=>{
        if(err){
            console.log('hash did not work!')
            res.render("register",{success: false,msg:"Either the username already exists or something went wrong."})
        }else{
            console.log('hash did work!')
            res.render("home",{success:true,msg:"User registered! You may login."})    
        }
    });
});

app.post("/authenticate",function(req,res,next){

    console.log("hit the authenticate")
    //LOGIN PARAMETERS
    const username = req.body.username;
    const password = req.body.password;
    
    db.getUserByUsername(username, (err,user) => {
        if(err) {
            console.log(err)
        }
        if(!user){
            return res.render("home",{success:false,msg:"User not found."});
        }else{
            db.comparePassword(password, user[0].password,(err, isMatch)=>{
                if(err) throw err;
                if(isMatch){
                    const token = jwt.sign({data: user},'verysecret',{expiresIn:604800}); //1 week
                res.render("upload",{
                    success:true,
                    msg:null,
                    token: 'JWT '+token,
                    user:user[0].username
                    
                });  
                }else{
                    return res.render("home",{success:false,msg:'wrong password'})
                }   
            });
        }
    }); 
});

app.post("/getStatus",function(req,res,next){

    var apiKey = "R=rOcP^{0HZz";
    var trackingNumber = req.body.trackingid;
    console.log("the tracking number used in api: "+trackingNumber)
   
    db.hasTrackingId(trackingNumber,(err,result)=>{
        if(err){
            console.log("error from matching function: "+err);
            return res.render("customer",{data:null,msg:"Internal Server Error, something went wrong."});
        }else{
            console.log("tracking match results in route: "+result);
            if(result.length>0){
                console.log("Succesful Tracking Number Match");
            }else{
                console.log("No tracking numbers found");
                return res.render("customer",{data:null,msg:"No matching tracking number found."});
            }
        }
    });

    console.log("tracking number about to put in url :"+trackingNumber)
    var url = "http://OSMART.OSMWORLDWIDE.US/OSMServices/TrackingRESTService.svc/Tracking?trackingNumbers="+trackingNumber+"&format=JSON&APIKey="+apiKey;
    console.log("Create URL string: "+url)
    //BEGIN API REQUEST
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
        //  console.log(response)
            if(body=="Invalid request, please check your parameters and APIKey."){
                return res.render("customer",{data:null,msg:"There is an error with the shipping API"});
            }
            console.log("parsed json obj body response" + JSON.parse(body) )
            var data = JSON.parse(body);// Print the google web page.
            //Checks "City" on events array, if one exists we know we need to format event data
         

            if(data["Items"][0]["Events"][0]["City"]!=null){ 
                var eventArray =[];
                var date;
                var status;
                var location;
                var tempDate;
                var ampm;
                var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                var months = ['January','February','March','April','May','June','July','August','September','October','November','December']
                //Formats a Date for each tracking event in the array
                for(var i=0;i < data["Items"][0]["Events"].length; i++){
                    tempDate = data["Items"][0]["Events"][i]["Date"]
                    date = new Date(parseInt(tempDate.substr(6)));
                    var year = date.getFullYear();
                    var month = months[date.getMonth()];
                    var daydate = date.getDate();
                    var dayname = days[date.getDay()];
                    if(date.getHours()>12){
                        ampm = "PM"
                    }else{
                        ampm = "AM"
                    }
                    var hour =  ((date.getHours() + 11) % 12 + 1);//converts 24-hour time to 12-hour time
                    var minute = date.getMinutes();
                    console.log(minute.length)
                    if(minute.toString().length==1){
                        minute = "0"+minute;
                    }
                    var dateString = dayname + ' ' + month + ' ' + daydate + ' ' + year + ' ' + hour + ':' + minute +' '+ ampm;
                    status = data["Items"][0]["Events"][i]["StatusDescription"]
                    location = data["Items"][0]["Events"][i]["DisplayLocation"]
                    eventArray.push([dateString,status,location]);//2D array sent to front end
                }
            }

        var theData = {
            Description:data["Items"][0]["Events"][0]["StatusDescription"],
            Events:eventArray,
            Expected:data["Items"][0]["ExpectedDelivery"],
            PackageId:data["Items"][0]["TrackingId"],
            CustomerPackageId:data["Items"][0]["CustomerPackageId"]
        }
        console.log("Constructed Array: " + eventArray)
        res.render("customer",{data:theData,msg:null});
        }else{
            console.log("api error is: "+error);
        }
    });
});


app.get("/getStatus/custom/:trackingid",function(req,res,next){

    var apiKey = "R=rOcP^{0HZz";
    var trackingNumber;
    console.log()
    console.log("the param: "+req.params.trackingid)
    if(req.params.trackingid){
        console.log("hit param")
        trackingNumber = req.params.trackingid;
    }
    console.log("the tracking number used in api: "+trackingNumber)
   
    db.hasTrackingId(trackingNumber,(err,result)=>{
        if(err){
            console.log("error from matching function: "+err);
            return res.render("customer",{data:null,msg:"Internal Server Error, something went wrong."})
        }else{
            console.log("tracking match results in route: "+result)
            if(result.length>0){
                console.log("Succesful Tracking Number Match")
            }else{
                console.log("No tracking numbers found");
                return res.render("customer",{data:null,msg:"No matching tracking number found."});
            }
        }
    });
    console.log("tracking number about to put in url :"+trackingNumber)
    var url = "http://OSMART.OSMWORLDWIDE.US/OSMServices/TrackingRESTService.svc/Tracking?trackingNumbers="+trackingNumber+"&format=JSON&APIKey="+apiKey;
    console.log("Create URL string: "+url)
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            //  console.log(response)
            if(body=="Invalid request, please check your parameters and APIKey."){
                return     res.render("customer",{data:null,msg:"There is an error with the shipping API"});
            }
            console.log("parsed json obj body response" + JSON.parse(body) )
            var data = JSON.parse(body);// Print the google web page.
            if(data["Items"][0]["Events"][0]["City"]!=null){ 
                var eventArray =[];
                var date;
                var status;
                var location;
                var tempDate;
                var ampm;
                var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                var months = ['January','February','March','April','May','June','July','August','September','October','November','December']
                for(var i=0;i < data["Items"][0]["Events"].length; i++){
                    tempDate = data["Items"][0]["Events"][i]["Date"]
                    date = new Date(parseInt(tempDate.substr(6)));
                    var year = date.getFullYear();
                    var month = months[date.getMonth()];
                    var daydate = date.getDate();
                    var dayname = days[date.getDay()];
                    if(date.getHours()>12){
                        ampm = "PM"
                    }else{
                        ampm = "AM"
                    }
                    var hour =  ((date.getHours() + 11) % 12 + 1);
                    var minute = date.getMinutes();
                    console.log(minute.length)
                    if(minute.toString().length==1){
                        minute = "0"+minute;
                    }
                    var dateString = dayname + ' ' + month + ' ' + daydate + ' ' + year + ' ' + hour + ':' + minute +' '+ ampm;
                    status = data["Items"][0]["Events"][i]["StatusDescription"]
                    location = data["Items"][0]["Events"][i]["DisplayLocation"]
                    eventArray.push([dateString,status,location]);
                }
            }
            var theData = {
            Description:data["Items"][0]["Events"][0]["StatusDescription"],
            Events:eventArray,
            Expected:data["Items"][0]["ExpectedDelivery"],
            PackageId:data["Items"][0]["TrackingId"],
            CustomerPackageId:data["Items"][0]["CustomerPackageId"]
            }
            console.log("Constructed Array: " + eventArray)
            return res.render("customer",{data:theData,msg:null});
        }else{
            console.log("api error is: "+error);
        }
    });
});



//PORT 8080 for testing, process.env.PORT for Production Environment
const port = process.env.PORT || 8080;
//Listening on PORT
app.listen(port,process.env.IP,function(){
    console.log("The PolyTrader server has started on port " + port);
});

