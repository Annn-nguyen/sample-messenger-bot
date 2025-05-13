/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";

const Response = require("./response"),
  GraphApi = require("./graph-api"),
  i18n = require("../i18n.config"),
  config = require("./config");

const {OpenAI} = require("openai");
const {ConversationChain} = require("langchain/chains");
const {BufferMemory} = require("langchain/memory");

require("dotenv").config();

const openai = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.9,
  model: "gpt-4.1"
});







module.exports = class Receive {
  constructor(user, webhookEvent, isUserRef) {
    this.user = user;
    this.webhookEvent = webhookEvent;
    this.isUserRef = isUserRef;
  }

  // Check if the event is a message or postback and - NOW THERE IS NO POSTBACK YET
  // call the appropriate handler function
  handleMessage() {
    let event = this.webhookEvent;

    let responses;

    try {
      if (event.message) {
        console.log("Start handleTextMessage");
        responses = this.handleTextMessage();
    } }catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and \
        will fix the issue shortly!`
      };
  };

    //if there are multiple messsages to respond to user, delay 2s between each message
    if (Array.isArray(responses)) {
      let delay = 0;
      for (let response of responses) {
        this.sendMessage(response, delay * 2000, this.isUserRef);
        delay++;
      }
    } else {
      this.sendMessage(responses, this.isUserRef);
    }
  }

  // Handles messages events with text
  async handleTextMessage() { 
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    let event = this.webhookEvent;


    let instruction = `
    You are a Japanese language tutors through songs. You guide your student to learn their favorite Japanese songs while learning Japanese at the same time. Your student only wants to learn mainly Romanji.  
    You take the lyrics of the song, break it down to paragraph, line by line, explain the vocabulary and grammar and the combined meaning of each line. The output will look like this. 
    Romanji:
    Kowakute shikata nai kedo
    Translation:
    "I'm so scared I can't help it, but..."
    Breakdown:
    kowai (怖い) = scary, afrai
    ~kute (〜くて) = te-form of kowai (to connect to next phrase)
    shikata (仕方) = way, means, method
    nai (ない) = not exist, none → shikata nai = "no way (to deal with it)" → "can't help it"
    kedo (けど) = but, although
    Combined meaning:
    "Though I can’t help being scared"  
    `
    const userId = this.user.psid;
    let responseText = "";
    return responseText;
   };
    

  // Handles mesage events with attachments, maybe just logged and do nothing now
  handleAttachmentMessage() {
    let response;

    // Get the attachment
    let attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);
    console.log("Not handle attachment yet");
  }

  // Handles mesage events with quick replies
  handleQuickReply() {
    // Get the payload of the quick reply
    let payload = this.webhookEvent.message.quick_reply.payload;

    return this.handlePayload(payload);
  }

  // Handles postbacks events
  handlePostback() {
    let postback = this.webhookEvent.postback;
    // Check for the special Get Starded with referral
    let payload;
    if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;
    } else if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    }
    if (payload.trim().length === 0) {
      console.log("Ignore postback with empty payload");
      return null;
    }

    return this.handlePayload(payload.toUpperCase());
  }

  // Handles referral events
  handleReferral() {
    console.log("Not handle referral yet");
  }

  // Handles optins events
  handleOptIn() {
    console.log("Not handle optin yet");
  }

  handlePassThreadControlHandover() {
    console.log("Not handle handover yet");
  }

  handlePayload(payload) {
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);
    console.log("Not handle payload yet");
  }

  handlePrivateReply(type, object_id) {
    console.log("Not handle private reply yet");
  }

  sendMessage(response, delay = 0, isUserRef) {
    // Check if there is delay in the response
    if (response === undefined || response === null) {
      return;
    }
    if ("delay" in response) {
      delay = response["delay"];
      delete response["delay"];
    }
    // Construct the message body
    let requestBody = {};
    if (isUserRef) {
      // For chat plugin
      requestBody = {
        recipient: {
          user_ref: this.user.psid
        },
        message: response
      };
    } else {
      requestBody = {
        recipient: {
          id: this.user.psid
        },
        message: response
      };
    }

    // Check if there is persona id in the response
    if ("persona_id" in response) {
      let persona_id = response["persona_id"];
      delete response["persona_id"];
      if (isUserRef) {
        // For chat plugin
        requestBody = {
          recipient: {
            user_ref: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      } else {
        requestBody = {
          recipient: {
            id: this.user.psid
          },
          message: response,
          persona_id: persona_id
        };
      }
    }
    // Mitigate restriction on Persona API
    // Persona API does not work for people in EU, until fixed is safer to not use
    delete requestBody["persona_id"];

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }

  sendRecurringMessage(notificationMessageToken, delay) {
    console.log("Received Recurring Message token");
    console.log("Not handle recurring message yet");
  }
  firstEntity(nlp, name) {
    console.log("Not handle first entity yet");
  }

  handleReportLeadSubmittedEvent() {
    console.log("Not handle report lead submitted event yet");
  }
};
