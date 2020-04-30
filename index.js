'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

const fs = require('fs');
const request = require('request');
const fb_utils = require('./fb_utils');
const commands = require('./commands');
const db_utils = require('./db_utils');

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);

        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log('Sender PSID: ' + sender_psid);
        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhook_event.message) {
          db_utils.get_user(sender_psid)
              .then(res=>{
                // add new user
                if (res.length == 0){
                  fb_utils.getProfileInfo(sender_psid).then(info => {
                      db_utils.add_user(sender_psid, info.first_name).then(res=> {
                         fb_utils.sendText(sender_psid, `Hello, ${info.first_name}! You have been registered.`);
                      });
                  });
                }
              });

          if (webhook_event.message.text){
            commands.parse(sender_psid, webhook_event.message.text);
          }

        } else if (webhook_event.postback) {
          //fb_utils.handlePostback(sender_psid, webhook_event.postback);
        }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "GqmJKA4o3jIUJlJD"
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

app.get('/users', (req, res) => {
  db_utils.get_users().then(qres => {
    res.status(200).send(qres);
  });
});

app.get('/info', (req,resp) => {
  fb_utils.getProfileInfo(2973343992754997).then(res=>{
    resp.status(200).send(res);
  })
})

