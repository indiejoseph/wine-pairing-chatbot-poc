import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { SendMessageInput } from '../components';

const ChatUI = dynamic(() => import('../components/chat-ui').then(Module => Module.ChatUI), {
  ssr: false,
});

const sendMessage = async ({ message, command }: SendMessageInput) => {
  let userId = window.localStorage.getItem('userId');

  if (!userId) {
    userId = Math.random().toString(36).slice(2, 15);

    window.localStorage.setItem('userId', userId);
  }

  const res = await fetch('/api/chat', {
    body: JSON.stringify({ userId, message, command }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const resJson = await res.json();

  return resJson;
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Sophia the Sommelier</title>
        <meta content="Wine paring AI Assistant" name="description" />
        <meta
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover"
          name="viewport"
        />
        <link href="/favicon.ico" rel="icon" />
        <style>
          {`
            .main {
              height: 100vh;
              box-sizing: border-box;
            }
          `}
        </style>
      </Head>

      <main>
        <ChatUI onSend={sendMessage} />
      </main>
    </>
  );
}
