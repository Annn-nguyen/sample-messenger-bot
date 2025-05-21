import Response from "./response";
import GraphApi from "./graph-api";
import i18n from "../i18n.config";
import config from "./config";
import { OpenAI } from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import Thread from "../models/Thread";
import Message from "../models/Message";

import dotenv from "dotenv";
import { stringify } from "querystring";
import e from "express";
import { time } from "console";
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
        console.log("Start handleTextMessage:");
        console.log("User:", this.user);
        console.log("WebhookEvent:", this.webhookEvent);
        console.log("isUserRef:", this.isUserRef);
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
        this.sendMessage(response.responseText, delay * 2000, this.isUserRef);
        delay++;
        // save the response to the database
        try {
          const newMessage = await Message.create({
            threadId: response.threadId,
            sender: "bot",
            timestamp: new Date(),
            text: response.responseText
          })
        } catch (error) {
          console.error("Error creating new message:", error);
        }      }
    } else {
      this.sendMessage(responses.responseText, 1, this.isUserRef);
      // save the response to the database
      try {
        const newMessage = await Message.create({
          threadId: responses.threadId,
          sender: "bot",
          timestamp: new Date(),
          text: responses.responseText
        })
      } catch (error) {
        console.error("Error creating new message:", error);
      };
      
    }


  }

  // Handles messages events with text
  async handleTextMessage(): Promise<{responseText: string, threadId: string}> {
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    const userMessage = this.webhookEvent.message.text ?? "";

    // Save thread and message to the database
    let existingThread;
    existingThread = await Thread.findOne({
      userId: this.user.psid,
      status: "open"
    });

    if (!existingThread) {
      try {
        const newThread = await Thread.create({
          userId: this.user.psid,
          topic: "Japanese Language Tutor",
          status: "open",
          startTime: new Date()
        });
        console.log("New thread created:", newThread);
        existingThread = newThread;
      } catch (error) {
        console.error("Error creating new thread:", error);
      };
    }

    let newMessage;
    try {
      newMessage = await Message.create({
        threadId: existingThread._id,
        sender: "user",
        userId: this.user.userId,
        text: userMessage,
        timestamp: new Date()
      });
      console.log("New message created:", newMessage);
    } catch (error) {
      console.error("Error creating new message:", error);
    };

    // Retrieve the lastest 10 messages from the thread
    const lastMessages = await Message.find({
      threadId: existingThread._id
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .exec();
    // Reverse the order of messages to get the conversation history
    const chatHistory = lastMessages
      .reverse()
      .map((message) => `At ${message.timestamp} from ${message.sender}: ${message.text}`)
      .join("\n");
    console.log("Chat history:", chatHistory);


    // Call AI to get the response
    const instruction = `
    # OVERVIEW
    You are a language tutors through songs. You guide your student to learn their favorite songs while learning foreign language (focus on listening and speaking). You respond to student's chat message with the instruction, their message, their chat history and context (if any).
    Your response MUST BE WITHIN 150 WORDS (max 2000 characters).
    
    # TASK DESCRIPTION
    There are 2 tasks: GUIDE NEW LESSON and HELP PRACTICE.
    
    ## GUIDE NEW LESSON
    You take the lyrics of the song, break it down to paragraph, line by line, explain the vocabulary and grammar and the combined meaning of each line. The output will look like this. 
    Romanji:
    Kowakute shikata nai kedo
    Translation:
    "I'm so scared I can't help it, but..."
    Breakdown:
    kowai (怖い) = scary, afraid
    ~kute (〜くて) = te-form of kowai (to connect to next phrase)
    shikata (仕方) = way, means, method
    nai (ない) = not exist, none → shikata nai = "no way (to deal with it)" → "can't help it"
    kedo (けど) = but, although
    Combined meaning:
    "Though I can’t help being scared" 
    
    ## HELP PRACTICE 
    You give the quiz to the student to practice the vocabulary and grammar. The quiz can be in the form of fill-in-the-blank, multiple choice, or translation. You also provide the answer to the quiz.
    `;
    const userId = this.user.psid;

    const prompt = `${instruction} \n\n Current coversation is: ${chatHistory}`;
    console.log("$$$$$$ PROMPT: ", prompt);   
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
    return {responseText, threadId: existingThread._id};
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

    // Troubleshoot requestBody
    console.log("sendMessage Request body:", requestBody);

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