const request = require('request');
const db_utils = require('./db_utils');

function sendText (sender_psid, reply){
    callSendAPI(sender_psid, {
          "text": reply
        });
}

function sendGlobalText(text) {
  db_utils.get_all_sids().then(sids=>{
    console.log('sending global message: '+text);
    for (var i=0;i<sids.length;i++){
      callSendAPI(sids[i],{
        "text": "🌎 " + text
      });
    }
  });
}



function callSendAPI(sender_psid, message) {
      // Construct the message body
      let request_body = {
        "recipient": {
          "id": sender_psid
        },
        "message": message 
      }
      // Send the HTTP request to the Messenger Platform
      request({
        "uri": "https://graph.facebook.com/v6.0/me/messages",
        "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
      }, (err, res, body) => {
        if (!err) {
          //console.log('message sent!');
        } else {
          console.error("Unable to send message:" + err);
        }
      });
}

function getProfileInfo(sid) {
  return new Promise((resolve, reject)=>{
    request({
          "uri": "https://graph.facebook.com/"+sid,
          "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN,
            "fields":  "name,first_name,last_name"
           },
          "method": "GET",
        }, (err, res, body) => {
          if (!err) {
            console.log('message sent! Got response:');
            console.log(body);
            resolve(JSON.parse(body));
          } else {
            console.error("Unable to send message:" + err);
            reject(err)
          }
        });
  });
  //https://graph.facebook.com/<PSID>?fields=first_name,last_name,profile_pic&access_token=<PAGE_ACCESS_TOKEN>
}

module.exports = {
  callSendAPI: callSendAPI,
  sendText: sendText,
  sendGlobalText: sendGlobalText,
  getProfileInfo: getProfileInfo
}
