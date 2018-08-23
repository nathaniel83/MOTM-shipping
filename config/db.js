var mysql = require("mysql");
var bcrypt = require("bcryptjs");

const db = mysql.createConnection({
    host     : 'daaashleydbinstance.c8t7ta0pz7pb.us-east-2.rds.amazonaws.com',
    user     : 'daaashley',
    password : 'Watayo66$',
    database : 'mailonthemove',
    port : '3306'
 });


 module.exports = db;


 module.exports.getUserByUsername = function(username,callback){
    console.log("got here")
    const usernamequery = "SELECT * FROM users WHERE username='"+ username +"'";
    console.log(usernamequery)
    
    db.query(usernamequery,function(err,result){
        if(err) {
            callback(err,null);
        }else{
            callback(null,result)
        }
    })
}

module.exports.passwordHash = function(newUser,callback){
    console.log(newUser)
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(newUser.password,salt,(err,hash)=>{
            if(err) throw err;
            console.log("the hash"+hash)
            newUser.password = hash;
            
            let sql = "INSERT INTO users (username,password,type) VALUES('"+newUser.username+"','"+newUser.password+"','admin')";
            console.log(sql);
            db.query(sql,function(err,result){
                if(err) {
                    callback(err,null);
                }else{
                    callback(null,result)
                }
              
                
            })
            
        });
    });
  

}

module.exports.comparePassword = function(candidatePassword, hash, callback){
    bcrypt.compare(candidatePassword,hash,(err,isMatch)=>{
        if(err) throw err;
        callback(null,isMatch);
    })
} 


module.exports.storeTrackingData = function(theData,theUser,callback){
    console.log("attempting to store tracking data");
    console.log("the user is: "+theUser)
    let time = Date.now()
    for(var i = 0; i<theData.length;i++){
    let sql = "INSERT INTO tracking (tracking_id,submitting_user,created) VALUES ('"+theData[i]['I']+"','"+theUser+"','"+time+"')";
    db.query(sql,function(err,result){
        if(err) {
            callback(err,null);
        }else{
            callback(null,result)
        }
      
        
    })

}
}

module.exports.hasTrackingId = function(trackingId,callback){
    console.log("Checking to see if tracking id matches database records with this id: "+trackingId)
    let sql = "SELECT * FROM tracking WHERE tracking_id='"+trackingId+"'";
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}
