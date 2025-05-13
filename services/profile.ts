import GraphApi from "./graph-api";
import i18n from "../i18n.config";
import config from "./config";

const locales: string[] = i18n.getLocales();

export default class Profile {
  setWebhook(): void {
    GraphApi.callSubscriptionsAPI();
    GraphApi.callSubscribedApps();
  }

  setPageFeedWebhook(): void {
    GraphApi.callSubscriptionsAPI("feed");
    GraphApi.callSubscribedApps("feed");
  }

  setThread(): void {
    const profilePayload = {
      ...this.getGetStarted(),
      ...this.getGreeting(),
    };
    GraphApi.callMessengerProfileAPI(profilePayload);
  }

  setGetStarted(): void {
    const getStartedPayload = this.getGetStarted();
    GraphApi.callMessengerProfileAPI(getStartedPayload);
  }

  setGreeting(): void {
    const greetingPayload = this.getGreeting();
    GraphApi.callMessengerProfileAPI(greetingPayload);
  }


  setWhitelistedDomains(): void {
    const domainPayload = this.getWhitelistedDomains();
    GraphApi.callMessengerProfileAPI(domainPayload);
  }

  getGetStarted(): object {
    return {
      get_started: {
        payload: "GET_STARTED"
      }
    };
  }

  getGreeting(): object {
    const greetings: { locale: string; text: string }[] = [];
    for (const locale of locales) {
      greetings.push(this.getGreetingText(locale));
    }
    return {
      greeting: greetings
    };
  }
  

  getGreetingText(locale: string): { locale: string; text: string } {
    const param = locale === "en_US" ? "default" : locale;
    i18n.setLocale(locale);
    const localizedGreeting = {
      locale: param,
      text: i18n.__("profile.greeting", {
        user_first_name: "{{user_first_name}}"
      })
    };
    console.log({ localizedGreeting });
    return localizedGreeting;
  }


  getWhitelistedDomains(): object {
    const whitelistedDomains = {
      whitelisted_domains: config.whitelistedDomains
    };
    console.log({ whitelistedDomains });
    return whitelistedDomains;
  }
}