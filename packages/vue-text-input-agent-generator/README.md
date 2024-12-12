
## Text Input Agent generator for Vue

Demo

https://github.com/user-attachments/assets/721d4dc8-7cd3-4cef-9135-8e85b1287d31


### install

```sh
yarn add @receptron/text_input_agent_generator
```

### Usage

```html
<div v-if="inputPromises.length > 0">
  <div v-for="(inputPromise, k) in inputPromises" class="flex">
    <input
      v-model="userInputs[inputPromise.params['name']]"
      @keyup.enter="callSubmit"
      class="border-2 p-2 rounded-md flex-1 m-4"
      :placeholder="inputPromise.params['name']"
    />
    <button
      class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4"
      :class="inputPromise.length == 0 ? 'bg-sky-200' : 'bg-sky-500'"
      @click="callSubmit(inputPromise.id, inputPromise.params['name'])"
    >
      Submit
    </button>
  </div>
</div>
```

```typescript
import { defineComponent, ref } from "vue";

import { GraphAI } from "graphai";
import { textInputAgentGenerator } from "@receptron/text_input_agent_generator";

export default defineComponent({
  setup() {
    const userInputs = ref({});
    const selectdGraph = ref(graphData);
    const { textInputAgent, inputPromises, submit } = textInputAgentGenerator();

    const run = async () => {
      const graphai = new GraphAI(graphData, { ...vanilla, textInputAgent: agentInfoWrapper(textInputAgent) });
      const result = await graphai.run(true);
      console.log(result);
    };
    run();

    const callSubmit = (id: string, inputKey: string) => {
      submit(id, userInputs.value[inputKey]);
    };

    return {
      inputPromises,
      userInputs,
      callSubmit,
    };
  }
});
```
