import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatAgent } from '../../lib/agents/chat-agent';

export type Output = {
  message: string;
  command?: string;
};

export type Input = {
  message?: string;
  command?: string;
  userId: string;
};

const chatAgent = new ChatAgent();

export default async function handler(req: NextApiRequest, res: NextApiResponse<Output>) {
  const { body } = req;
  const { userId, message, command } = body as Input;

  if (!userId) {
    res.status(400).json({ message: 'Missing required parameters.' });

    return;
  }

  if (message) {
    // respond to message
    const output = await chatAgent.run(userId, message);
    const { message: outputMessage } = output;

    if (!outputMessage) {
      res.status(200).json({ message: 'Sorry, something went wrong, please try again later.' });

      return;
    }

    res.status(200).json(output);

    return;
  }

  if (command && !command.startsWith('Non') && /^([A-Za-z]+)\[(.+)]$/.test(command)) {
    // execute command
    const commandOutput = await chatAgent.execCommand(userId, command);

    if (!commandOutput.message) {
      res.status(200).json({ message: 'Sorry, something went wrong, please try again later.' });

      return;
    }

    res.status(200).json(commandOutput);

    return;
  }

  res.status(200).json({ message: "Sorry, I don't understand." });
}
