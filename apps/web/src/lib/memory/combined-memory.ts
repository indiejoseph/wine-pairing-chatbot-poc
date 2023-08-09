import type { InputValues, MemoryVariables, OutputValues } from 'langchain/dist/memory/base';
import { BaseMemory } from 'langchain/memory';

export class CombinedMemory extends BaseMemory {
  public memories: BaseMemory[];

  constructor(memories: BaseMemory[]) {
    super();
    this.memories = memories;
  }

  public get memoryKeys() {
    return this.memories.flatMap(m => m.memoryKeys);
  }

  public loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
    const variables = this.memories.reduce(async (p, m) => {
      const aggregatedVariables = await p;
      const newVariables = await m.loadMemoryVariables(values);

      return { ...aggregatedVariables, ...newVariables };
    }, Promise.resolve({} as MemoryVariables));

    return variables;
  }

  public async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
    await Promise.all(this.memories.map(m => m.saveContext(inputValues, outputValues)));
  }
}
