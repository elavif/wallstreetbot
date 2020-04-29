const request = require('request');

function handleMessage (sender_psid, received_message) {
      
      // for POC, send back the message, reversed.
      if (received_message.text){
        var reversed_text = received_message.text.split("").reverse().join("");
        sendText(sender_psid, reversed_text);
      }
}


function handlePostback(sender_psid, received_postback) {

}

function sendText (sender_psid, reply){
    callSendAPI(sender_psid, {
          "text": reply
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
          console.log('message sent! Got response:');
          console.log(body);
        } else {
          console.error("Unable to send message:" + err);
        }
      });
} 

module.exports = {
  callSendAPI: callSendAPI,

  sendText: sendText,

  handleMessage: handleMessage,

  handlePostback: handlePostback, 
}
