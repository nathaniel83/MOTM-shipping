var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var db = require("./config/db");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const fileUpload = require('express-fileupload');
var request = require('request');

const csv=require('csvtojson')


//...
app.use(fileUpload());


const cors = require('cors');
const passport = require("passport");
const path = require('path');

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



//connect to db
db.connect(function(error){
    if(error){
        console.log('error connecting db: '+error)
    }else{
        console.log('Connected to database');
    }
});


//routes
app.get("/",function(req,res,next){
    res.render("home",{msg:null});
})
app.get("/customer",function(req,res,next){
    res.render("customer",{data:null,msg:null});
})

app.get("/upload",passport.authenticate('jwt',{session:false}),function(req,res,next){
    res.render("upload",{data:null});
})

app.post("/upload",function(req,res,next){
   console.log("upload route");
   console.log(req.files.thefile.name);
   //Save File
   let csvFile = req.files.thefile;
   let user = req.body.theuser;
   let token = req.body.thetoken;
   csvFile.mv('./dataFolder/data.csv', function(err) {
    if (err){
      
      console.log("there is an error: " +err)
    }else{
    console.log("File uploaded!");
    }
  });

   const csvFilePath='./dataFolder/data.csv';
  //Convert to JSON
    csv({noheader: true,headers: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK']})
        .fromFile(csvFilePath)
            .then((jsonObj)=>{
                console.log(JSON.stringify(jsonObj).substring(0,100));
                db.storeTrackingData(jsonObj,user,(err,result)=>{
                    if(err){
                        console.log("store tracking err: "+err)
                        res.render("upload",{msg:"There was an error uploading the file."})
                    }else{
                        console.log("Success: "+result)
                        
                    }
                })
            });
            res.render("upload",{msg:"Successfully uploaded the file!",user:user,token:token});
        })


app.get("/register",function(req,res,next){
    res.render("register",{msg:null});
    
})

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
        };
        if(!user){
            return res.render("home",{success:false,msg:"User not found."});
        }else{
        
        db.comparePassword(password, user[0].password,(err, isMatch)=>{
            if(err) throw err;
            if(isMatch){
                const token = jwt.sign({data: user},'verysecret',{
                    expiresIn:604800 //1 week
                });
                res.render("upload",{
                    success:true,
                    msg:null,
                    token: 'JWT '+token,
                    user:user[0].username
                    
                })  
            }else{
                return res.render("home",{success:false,msg:'wrong password'})
            }
        
        })
    }
    })
    
    })

app.post("/getStatus",function(req,res,next){
    var apiKey = "R=rOcP^{0HZz";
    var trackingNumber = req.body.trackingid;
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
    })
    console.log("tracking number about to put in url :"+trackingNumber)
    var url = "http://OSMART.OSMWORLDWIDE.US/OSMServices/TrackingRESTService.svc/Tracking?trackingNumbers="+trackingNumber+"&format=JSON&APIKey="+apiKey;
    console.log("Create URL string: "+url)
request(url, function(error, response, body) {
  if (!error && response.statusCode == 200) {
    //  console.log(response)
    if(body=="Invalid request, please check your parameters and APIKey."){
        return     res.render("customer",{data:null,msg:"There is an error with the shipping API"});

    }
    console.log("parsed json obj body response" + JSON.parse(body) )// Print the google web page.
   
   
    res.render("customer",{data:JSON.parse(body),msg:null});
  }else{
      console.log("api error is: "+error);
  }
})
})



//listen
const port = process.env.PORT || 8080;//3000

app.listen(port,process.env.IP,function(){
    console.log("The PolyTrader server has started on port " + port);
});