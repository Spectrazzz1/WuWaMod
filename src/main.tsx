// Visit developers.reddit.com/docs to learn Devvit!

import { Devvit, Context, OnTriggerEvent, TriggerContext } from '@devvit/public-api';
import { ModMail, MessageData } from '@devvit/protos';

Devvit.configure({
  http: true,
  redditAPI: true,
});

Devvit.addSettings([
  {
    type: 'string',
    name: 'webhook',
    label: 'Webhook URL',
  },
]);

Devvit.addTrigger({
  event: 'ModMail',
  onEvent: async (event: OnTriggerEvent<ModMail>, context: TriggerContext) => {
    try {

      if (!context) {
        throw new Error('Context is probably undefined');
      }

      await sendModMailToWebhook(event, context);
    } catch (error: any) {

      // let's handle errors and log them 
      console.error('There was an error:', error.message);
    }
  },
});

async function sendModMailToWebhook(event: OnTriggerEvent<ModMail>, context: TriggerContext) {
  try {

    // Retrieve the settings :)
    const webhook = (await context?.settings.get('webhook')) as string;

    if (!webhook) {
      console.error('No webhook URL provided');
      return;
    }

    const conversationId = event.conversationId ?? '';
    const actualConversationId = conversationId.replace('ModmailConversation_', '');
    const result = await context.reddit.modMail.getConversation({
      conversationId: conversationId,
      markRead: false,
    });
    const modmailLink = `https://mod.reddit.com/mail/all/${actualConversationId}`;

    // get the latest message
    const messages = result.conversation?.messages ?? {};
    const messageIds = Object.keys(messages);
    const lastMessageId = messageIds.length > 0 ? messageIds[messageIds.length - 1] : undefined;
    const lastMessage: MessageData | undefined = lastMessageId ? messages[lastMessageId] : undefined;
    // error if no message is found

    if (!lastMessage) {
      console.error('No messages found');
      return;
    }

    const authorName = lastMessage.author?.name ?? 'Unknown';
    const body = lastMessage.bodyMarkdown ?? '';
    const participatingAs = lastMessage.participatingAs ?? 'Unknown';
    const authorProfileLink = `https://www.reddit.com/u/${authorName}`;

    let payload;

      payload = {
        content: `New Modmail received`,
        embeds: [
          {
            title: `${result.conversation?.subject}`,
            url: modmailLink,
            author: {
              name: `u/${authorName}`,
              url: authorProfileLink,
            },
            description: `**Body**:\n${body}`,
            footer: {
              text: `Participating As: ${participatingAs}`,
              icon_url: 'https://styles.redditmedia.com/t5_5uplbt/styles/communityIcon_lb7qvrbnl0zc1.png',
            },
            color: '5198938',
          },
        ],
      };

if (participatingAs !== 'moderator') {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  

    if (!response.ok) {
      console.error('Error sending data to webhook');
    }
}
  } catch (error: any) {
    // Let's handle the errors and log them
    console.error('Error:', error.message);
  }

}

export default Devvit;