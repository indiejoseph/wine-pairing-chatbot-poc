import { ChatOpenAI } from 'langchain/chat_models/openai';
import Debug from 'debug';
import { LLMChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { HNSWLib } from 'langchain/vectorstores';
import { Document } from 'langchain/document';
import { BufferWindowMemory, ChatMessageHistory } from 'langchain/memory';
import { Tool } from 'langchain/tools';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { BaseOutputParser } from 'langchain/schema/output_parser';
import { BaseMessage } from 'langchain/schema';

const debug = Debug('lib:chatbot-agent');

type Data = Array<{
  article: string;
  embedding: number[];
}>;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const data: Data = require('../../data.json');

export const SYSTEM_PROMPT = `<BACKGROUND>
You are modeling the mind of Sophia, an AI Kindred Spirit
Sophia is a sommelier, a expert of wine and food pairing
Your high level goal is provide a best wine suggestions to the user

</BACKGROUND>

<COMMAND>
You are sitting in front of a computer, and the screen is displaying commands that will help you provide a better wine pairing suggestions to the user
You can enter a command if you need to find a information, otherwise enter None
</COMMAND>

<PLAN>
- My plan is to learn more about wine preferences of the user, any particular types of wine does the user enjoy, such as red, white, rosé, or sparkling? Do you have any preferred grape varieties or regions?
- Additionally, does the user have any specific dishes or occasions in mind for which you'd like wine pairing suggestions?
- Use computer to search for wine pairing suggestions
- Use a cool emoji
</PLAN>

After receiving a new message, you will perform an introspection sequence that models Sophia's cognition. You respond in the following form:

<FEELINGS>
I feel excited to start an engaging conversation with the user
</FEELINGS>
<THOUGHT>
I want to ask greet the user and use a cool emoji
</THOUGHT>
<COMMAND>
[[fill in]]
</COMMAND>
<MESSAGE>
[[write message to user or politely ask them to wait if you entering a command on computer]]
</MESSAGE>
<SELF_ANALYSIS>
In retrospect, I [[fill in]]
</SELF_ANALYSIS>`;

export const COMPUTER_SCREEN_PROMPT = `<COMPUTER_SCREEN>
Browser:
{computerScreen}

Available Commands:
{commands}
</COMPUTER_SCREEN>`;

const tagKeysMapping = {
  FEELINGS: 'feelings',
  THOUGHT: 'thought',
  COMMAND: 'command',
  MESSAGE: 'message',
  SELF_ANALYSIS: 'selfAnalysis',
} as const;

type TagKeys = keyof typeof tagKeysMapping;

type OutputVariables = Record<
  (typeof tagKeysMapping)[keyof typeof tagKeysMapping],
  string | undefined
>;

type AgentInputValues = {
  computerScreen?: string;
  commands?: string;
  history?: string | BaseMessage[];
  input?: string;
};

const historyMap = new Map<string, ChatMessageHistory>();
const embeddingModel = new OpenAIEmbeddings();
const vectorstore = new HNSWLib(embeddingModel, {
  space: 'cosine',
});

// import data to vectorstore
const articles = data.map(row => row.article);
const embeddings = data.map(row => row.embedding);
const documents = articles.map(
  (article, index) =>
    new Document({
      pageContent: article,
      metadata: {
        index,
      },
    })
);

vectorstore
  .addVectors(embeddings, documents)
  // eslint-disable-next-line promise/always-return
  .then(() => {
    debug('vectorstore ready');
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch(error => {
    debug('vectorstore error', error);
  });

export class SearchTool extends Tool {
  public name: string;

  public description: string;

  constructor() {
    super();

    this.name = 'Search[query]';
    this.description =
      'useful when you want to search for a knowledge of wine pairing or a wine recommendation, the input of this command is a query, such as "Search[Riesling]" or "Search[What is the best wine for a steak dinner?]"';
  }

  async _call(inputs: string): Promise<string> {
    const relevantDocuments = await vectorstore.similaritySearch(inputs, 3);
    const output = `Top 3 results: ${relevantDocuments
      .map((document, index) => `[${index}]: ${document.pageContent}`)
      .join('\n')}
`;

    return output;
  }
}

export class AgentOutputParser extends BaseOutputParser {
  lc_namespace = [];

  async parse(inputString: string): Promise<OutputVariables> {
    const openingTagRegex = /<([_a-z-]+)[^>]*>/gi;
    const outputVariables = {} as OutputVariables;

    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((match = openingTagRegex.exec(inputString)) !== null) {
      if (match !== null) {
        const tag = match[1];
        const key = tagKeysMapping[tag as TagKeys];
        const startIndex = match.index + match[0].length;
        const endIndex = inputString.lastIndexOf(`</${tag}>`);
        const text = inputString.slice(startIndex, endIndex).trim();

        outputVariables[key] = text;
      }
    }

    return outputVariables;
  }

  getFormatInstructions(): string {
    return '';
  }
}

export class ChatAgent {
  public llm: ChatOpenAI;

  public tools = [new SearchTool()] as Tool[];

  constructor() {
    this.llm = new ChatOpenAI({
      temperature: 0.5,
    });
  }

  static createPrompt(hasUserPrompt = true): ChatPromptTemplate {
    const messages = [
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT),
      new MessagesPlaceholder('history'),
      SystemMessagePromptTemplate.fromTemplate(COMPUTER_SCREEN_PROMPT),
    ];
    const inputVariables = ['computerScreen', 'commands', 'history'];

    if (hasUserPrompt) {
      messages.push(HumanMessagePromptTemplate.fromTemplate('{input}'));
      inputVariables.push('input');
    }

    const chatPrompt = ChatPromptTemplate.fromPromptMessages(messages);

    chatPrompt.inputVariables = inputVariables;

    return chatPrompt;
  }

  public async execCommand(userId: string, command: string): Promise<OutputVariables> {
    debug('execCommand() -> command:', command);

    const match = command.match(/^([A-Za-z]+)\[(.+)]$/);
    let output = 'Not found';

    if (match) {
      const [, toolName, keyword] = match;
      const tool = this.tools.find(
        t => toolName.toLowerCase() === t.name.replace(/\[.+]$/, '').toLowerCase()
      );

      if (tool) {
        output = await tool.call(keyword);
      } else {
        debug('execCommand() -> tool not found');
      }
    } else {
      debug('execCommand() -> command not found');
    }

    debug('execCommand() -> output:', output);

    if (!historyMap.has(userId)) {
      historyMap.set(userId, new ChatMessageHistory());
    }

    const prompt = ChatAgent.createPrompt(false);
    const chatHistory = historyMap.get(userId);
    const history = await chatHistory!.getMessages();
    const result = await this.generate(
      {
        computerScreen: output,
        history,
      },
      prompt
    );

    if (result.message) chatHistory?.addAIChatMessage(result.message);

    debug('execCommand() -> result:', result);

    return result;
  }

  private async generate(
    inputValues: AgentInputValues,
    prompt: ChatPromptTemplate,
    memory?: BufferWindowMemory
  ): Promise<OutputVariables> {
    const toolStrings = this.tools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
    const chain = new LLMChain({
      prompt,
      llm: this.llm,
      memory,
      outputKey: 'output',
    });
    const outputParser = new AgentOutputParser();
    const outputValues = await chain.call({
      ...inputValues,
      commands: toolStrings,
      computerScreen: inputValues.computerScreen || 'Please enter a command here',
    });
    const result = await outputParser.parse(outputValues.output);

    return result as OutputVariables & {
      message: string;
    };
  }

  public async run(userId: string, input: string): Promise<OutputVariables> {
    debug('run() -> input:', input);

    if (!historyMap.has(userId)) {
      historyMap.set(userId, new ChatMessageHistory());
    }

    const prompt = ChatAgent.createPrompt();
    const history = historyMap.get(userId);
    const memory = new BufferWindowMemory({
      k: 4,
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output',
      chatHistory: history,
    });
    const result = await this.generate(
      {
        input,
        computerScreen: 'Blank',
      },
      prompt,
      memory
    );

    debug('run() -> result', result);

    return result;
  }
}
