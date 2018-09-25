var mysql = require("mysql");
var bcrypt = require("bcryptjs");

const db = mysql.createConnection({
    host     : 'daaashleydbinstance.c8t7ta0pz7pb.us-east-2.rds.amazonaws.com',
    user     : 'daaashley',
    password : process.env.DATABASE_PASSWORD,
    database : 'mailonthemove',
    port : '3306'
 });


 module.exports = db;


 module.exports.getUserByUsername = function(username,callback){
    console.log("got here")
    const usernamequery = "SELECT * FROM users WHERE username='"+ username +"'";
    console.log(usernamequery)
    
    db.query(usernamequery,function(err,result){
        console.log("db res: "+JSON.stringify(result))
        if(result&&result.length==0){
            callback("User not found.",null)
            return;
        }
        else if(result[0].username==null||result[0].password==null){
            callback("Database Error: Either username or password was null.",null)
            return;
        }
        if(err) {
            callback(err,null);
            return;
        }else{
            callback(null,result)
            return;
        }
    })
}

module.exports.passwordHash = function(newUser,callback){
    console.log(newUser)
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(newUser.password,salt,(err,hash)=>{
            if(err) {
                console.log("password hash error in db func: "+err)
                callback(err,null);
            };
            console.log("the hash"+hash)
            newUser.password = hash;
            
            let sql = "INSERT INTO users (username,password,type,file_path) VALUES('"+newUser.username+"','"+newUser.password+"','"+newUser.type+"','"+newUser.username+"')";
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


module.exports.storeTrackingData = function(theData,theUser,theFile,callback){
    console.log("attempting to store tracking data");
    console.log("the user is: "+theUser)
 
    const dateTime = Date.now();
    const timestamp = Math.floor(dateTime / 1000);
    for(var i = 0; i<theData.length;i++){
    let sql = "INSERT INTO tracking (tracking_id,submitting_user,created,file_name) VALUES ('"+theData[i]['I']+"','"+theUser+"','"+timestamp+"','"+theFile+"')";
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


module.exports.addShippingFile = function(fileData,callback){
    console.log("hit shipping file function");
    let sql = "INSERT INTO shipping_data (user,file_name,file_path,upload_date,status) VALUES('"+fileData.user+"','"+fileData.file_name+"','"+fileData.file_path+"','"+fileData.upload_date+"','"+fileData.status+"')";
    console.log(sql);
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}

module.exports.getFiles = function(username,callback){
    console.log("Checking to see if tracking id matches database records with this id: "+username)
    let sql = "SELECT * FROM shipping_data WHERE user='"+username+"'";
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}

module.exports.getAllFiles = function(callback){
    console.log("grabbing all tracking data")
    let sql = "SELECT * FROM shipping_data";
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}

module.exports.changeStatus = function(user,file,callback){
    console.log("Changing status for: "+user + " "+file);
    let sql = "UPDATE shipping_data SET status='Processed' WHERE user='"+user+"'"+" AND file_name='"+file+"'";
    console.log(sql)
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}


module.exports.deleteFile = function(username,file,callback){
    console.log("Checking to see if tracking id matches database records with this id: "+username)
    let sql = "DELETE FROM shipping_data WHERE user='"+username+"'"+" AND file_name='"+file+"'";
    console.log(sql)
    db.query(sql,function(err,result){
        if(err){
            callback(err,null);
        }else{
            console.log("Resulting data from db track matching: "+JSON.stringify(result))
            callback(null,result);
        }
    })
}