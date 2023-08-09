import { BufferWindowMemory } from 'langchain/memory';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import {
  AgentOutputParser,
  COMPUTER_SCREEN_PROMPT,
  ChatAgent,
  SYSTEM_PROMPT,
  SearchTool,
} from './chat-agent';

describe('ChatAgent', () => {
  describe('AgentOutputParser', () => {
    it('should parse the input string and return the output variables', async () => {
      const inputString = `
          <FEELINGS>happy</FEELINGS>
          <THOUGHT>My name is John</THOUGHT>
          <COMMAND>What is your name?</COMMAND>
          <MESSAGE>My name is John</MESSAGE>
          <SELF_ANALYSIS>My name is John</SELF_ANALYSIS>
        `;
      const parser = new AgentOutputParser();
      const outputVariables = await parser.parse(inputString);

      expect(outputVariables).toEqual({
        feelings: 'happy',
        thought: 'My name is John',
        command: 'What is your name?',
        message: 'My name is John',
        selfAnalysis: 'My name is John',
      });
    });
  });

  describe('ChatAgent', () => {
    it('should generate a chat prompt', async () => {
      const prompt = ChatAgent.createPrompt();
      const memory = new BufferWindowMemory({
        k: 2,
        returnMessages: true,
      });

      memory.saveContext(
        {
          input: 'Hello',
        },
        {
          output: 'Hi',
        }
      );

      const { history } = await memory.loadMemoryVariables({});

      const output = await prompt.formatPromptValue({
        computerScreen: 'blank',
        commands: 'Tool 1, Tool 2, Tool 3',
        history,
        input: 'Hello',
      });

      expect(output.messages).toEqual([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage('Hello'),
        new AIMessage('Hi'),
        new SystemMessage(
          COMPUTER_SCREEN_PROMPT.replace('{computerScreen}', 'blank').replace(
            '{commands}',
            'Tool 1, Tool 2, Tool 3'
          )
        ),
        new HumanMessage('Hello'),
      ]);
    });
  });

  describe('Chatol', () => {
    // beware, this test is visiting the real website
    it('should return the search result', async () => {
      const tool = new SearchTool();

      const output = await tool.call('pants');

      expect(output).toBeDefined();
    }, 10_000);
  });

  describe('ChatAgent', () => {
    // beware, this test is calling the real API
    it('should exec the command', async () => {
      const agent = new ChatAgent();

      await agent.run('12345678', 'Hello');

      const output = await agent.run(
        '12345678',
        'I looking for a pairs of pants for my 5 years old son'
      );

      expect(output).toBeDefined();
    });
  });
});
