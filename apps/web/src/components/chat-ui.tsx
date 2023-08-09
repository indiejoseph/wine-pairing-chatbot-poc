import * as React from 'react';
import '@chatui/core/dist/index.css';
import Chat, { Bubble, ChatProps, useMessages } from '@chatui/core';

export interface ChatResponse {
  message: string;
  command?: string;
}

export interface SendMessageInput {
  message?: string;
  command?: string;
}

export interface ChatUIProps {
  history?: ChatProps['messages'];
  onSend: (input: SendMessageInput) => Promise<ChatResponse>;
}

export const ChatUI: React.FC<React.PropsWithChildren<ChatUIProps>> = ({
  history = [],
  onSend,
}) => {
  const { messages, appendMsg, setTyping } = useMessages(history);

  const handleSend: ChatProps['onSend'] = async (type: string, value: string) => {
    if (type === 'text' && value.trim()) {
      appendMsg({
        type: 'text',
        content: { text: value },
        position: 'right',
      });

      setTyping(true);

      const res = await onSend({ message: value });

      appendMsg({
        type: 'text',
        content: { text: res.message },
      });

      if (res.command && !res.command.startsWith('Non')) {
        const executeRes = await onSend({ command: res.command });

        appendMsg({
          type: 'text',
          content: { text: executeRes.message },
        });
      }
    }
  };

  const renderMessageContent: ChatProps['renderMessageContent'] = message => {
    const { content } = message;

    return <Bubble content={content.text} />;
  };

  return (
    <Chat
      locale="en-US"
      messages={messages}
      navbar={{
        title: 'Sophia the Sommelier',
      }}
      placeholder="Type a message"
      renderMessageContent={renderMessageContent}
      onSend={handleSend}
    />
  );
};
