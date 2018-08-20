var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var db = require("./config/db");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const fileUpload = require('express-fileupload');
var request = require('request');
//...
app.use(fileUpload());


const cors = require('cors');
const passport = require("passport");
const path = require('path');

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use( bodyParser.json({limit: '50mb'}) );

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
 
    next();
});

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
    res.render("home");
})
app.get("/customer",function(req,res,next){
    res.render("customer");
})

app.get("/upload",function(req,res,next){
    res.render("upload");
})

app.post("/upload",function(req,res,next){
   console.log("upload route");
   console.log(req.files.thefile.name);
});

app.get("/register",function(req,res,next){
    res.render("register");
})

app.post("/register",function(req,res,next){
    let newUser = {
        username:req.body.username,
        password:req.body.password,
        type:req.body.type
    }
    console.log(newUser)
    
    //PASSWORD ENCRYPT AND DATABASE INSERT--IN config/db.js
    
    db.passwordHash(newUser,(err)=>{
        if(err){
            console.log('hash did not work!')
            res.json({success: false,msg:"Failed to register"})
        }else{
            console.log('hash did work!')
            res.json({success:true,msg:"user registered"})    
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
            return res.json({success:false,msg:"User not found"});
        }else{
        
        db.comparePassword(password, user[0].password,(err, isMatch)=>{
            if(err) throw err;
            if(isMatch){
                const token = jwt.sign({data: user},'verysecret',{
                    expiresIn:604800 //1 week
                });
                res.render("upload",{
                    success:true,
                    token: 'JWT '+token
                    
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
    var url = "http://OSMART.OSMWORLDWIDE.US/OSMServices/TrackingRESTService.svc/Tracking?trackingNumbers="+trackingNumber+"&format=JSON&APIKey="+apiKey;
request(url, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // Print the google web page.
    res.send(body);
  }else{
      console.log("api error is: "+error);
  }
})
})



//listen
const port = 3000;//process.env.PORT || 8080;

app.listen(port,process.env.IP,function(){
    console.log("The PolyTrader server has started on port " + port);
});