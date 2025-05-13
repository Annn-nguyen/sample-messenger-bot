import Response from "./response";
import GraphApi from "./graph-api";
import i18n from "../i18n.config";
import config from "./config";
import { OpenAI } from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";

import dotenv from "dotenv";
dotenv.config();

const model = new ChatOpenAI({
  model: "gpt-4.1",
  openAIApiKey : process.env.OPEN_API_KEY
});


type WebhookEvent = any; // You can define a more specific type for your webhook events
type User = any; // Define your User type/interface as needed

export default class Receive {
  user: User;
  webhookEvent: WebhookEvent;
  isUserRef: boolean;

  constructor(user: User, webhookEvent: WebhookEvent, isUserRef: boolean) {
    this.user = user;
    this.webhookEvent = webhookEvent;
    this.isUserRef = isUserRef;
  }

  // Check if the event is a message or postback and call the appropriate handler function
  async handleMessage(): Promise<void> {
    const event = this.webhookEvent;
    let responses: any;

    try {
      if (event.message) {
        console.log("Start handleTextMessage");
        responses = await this.handleTextMessage();
      }
    } catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and will fix the issue shortly!`
      };
    }

    // If there are multiple messages to respond to user, delay 2s between each message
    if (Array.isArray(responses)) {
      let delay = 0;
      for (const response of responses) {
        this.sendMessage(response, delay * 2000, this.isUserRef);
        delay++;
      }
    } else {
      this.sendMessage(responses, 1, this.isUserRef);
    }
  }

  // Handles messages events with text
  async handleTextMessage(): Promise<string> {
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    const userMessage = this.webhookEvent.message.text ?? "";

    const instruction = `
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
    `;
    const userId = this.user.psid;

    const prompt = `${instruction} \n\n User's message is: ${userMessage}`;   
    const response = await model.invoke([new SystemMessage(prompt)]);
    // Normalize response.content to always be a string
  let responseText: string;
  if (typeof response.content === "string") {
    responseText = response.content;
  } else if (Array.isArray(response.content)) {
    responseText = response.content.map((part: any) => part.text ?? "").join("");
  } else {
    responseText = String(response.content ?? response.text ?? response);
  }

    console.log("Model response: ", responseText);
    return responseText;
  }

  // Handles message events with attachments
  handleAttachmentMessage(): void {
    // Get the attachment
    const attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);
    console.log("Not handle attachment yet");
  }

  // Handles message events with quick replies
  handleQuickReply(): any {
    // Get the payload of the quick reply
    const payload = this.webhookEvent.message.quick_reply.payload;
    return this.handlePayload(payload);
  }

  // Handles postbacks events
  handlePostback(): any {
    const postback = this.webhookEvent.postback;
    // Check for the special Get Started with referral
    let payload;
    if (postback.referral && postback.referral.type === "OPEN_THREAD") {
      payload = postback.referral.ref;
    } else if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    }
    if (payload && payload.trim().length === 0) {
      console.log("Ignore postback with empty payload");
      return null;
    }
    return this.handlePayload(payload.toUpperCase());
  }

  // Handles referral events
  handleReferral(): void {
    console.log("Not handle referral yet");
  }

  // Handles optins events
  handleOptIn(): void {
    console.log("Not handle optin yet");
  }

  handlePassThreadControlHandover(): void {
    console.log("Not handle handover yet");
  }

  handlePayload(payload: string): void {
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);
    console.log("Not handle payload yet");
  }

  handlePrivateReply(type: string, object_id: string): void {
    console.log("Not handle private reply yet");
  }

  sendMessage(response: any, delay = 0, isUserRef: boolean): void {
    // Check if there is delay in the response
    if (response === undefined || response === null) {
      return;
    }
    // i dont understand this code yet it created issue
    // if ("delay" in response) {
    //   delay = response["delay"];
    //   delete response["delay"];
    // }
    // Construct the message body
      // Wrap string responses as { text: ... }
    const messagePayload = typeof response === "string" ? { text: response } : response;

    let requestBody: any = {};
    if (isUserRef) {
      // For chat plugin
      requestBody = {
        recipient: {
          user_ref: this.user.psid
        },
        message: messagePayload
      };
    } else {
      requestBody = {
        recipient: {
          id: this.user.psid
        },
        message: messagePayload
      };
    }

    // Check if there is persona id in the response
    // if ("persona_id" in response) {
    //   const persona_id = response["persona_id"];
    //   delete response["persona_id"];
    //   if (isUserRef) {
    //     // For chat plugin
    //     requestBody = {
    //       recipient: {
    //         user_ref: this.user.psid
    //       },
    //       message: response,
    //       persona_id: persona_id
    //     };
    //   } else {
    //     requestBody = {
    //       recipient: {
    //         id: this.user.psid
    //       },
    //       message: response,
    //       persona_id: persona_id
    //     };
    //   }
    // }
    // Mitigate restriction on Persona API
    // Persona API does not work for people in EU, until fixed is safer to not use
    // delete requestBody["persona_id"];

    setTimeout(() => GraphApi.callSendApi(requestBody), delay);
  }

  sendRecurringMessage(notificationMessageToken: string, delay: number): void {
    console.log("Received Recurring Message token");
    console.log("Not handle recurring message yet");
  }

  firstEntity(nlp: any, name: string): void {
    console.log("Not handle first entity yet");
  }

  handleReportLeadSubmittedEvent(): void {
    console.log("Not handle report lead submitted event yet");
  }
}