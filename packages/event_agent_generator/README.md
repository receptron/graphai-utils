
## Event Agent generator

Demo

https://github.com/user-attachments/assets/721d4dc8-7cd3-4cef-9135-8e85b1287d31


### install

```sh
yarn add @receptron/event_agent_generator
```

### Usage

```html
<div class="w-10/12 bg-white">
  <div v-if="Object.values(events).length > 0">
    <div v-for="(event, k) in Object.values(events)" class="flex" :key="k">
      <div v-if="event.type === 'button'">
        <button class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4 bg-sky-500" @click="buttonClick(event)">
          event
        </button>
      </div>
      <div v-if="event.type === 'text'">
        <input v-model="userInputs[event.id]" class="border-2 p-2 rounded-md flex-1 m-4" :placeholder="event.nodeId" />
        <button class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4 bg-sky-500" @click="textClick(event)">
          Submit
        </button>
      </div>
    </div>
  </div>
</div>
```

```typescript
import { defineComponent, ref } from "vue";

import { GraphAI } from "graphai";
import { eventAgentGenerator } from "@receptron/event_agent_generator";

export default defineComponent({
  setup() {
    const userInputs = ref({});
    
    const events = ref({});
    const { eventAgent } = eventAgentGenerator((id, data) => {
      events.value[id] = data;
    });
    const buttonClick = (event) => {
      event.onEnd({ data: 123 });
      delete events.value[event.id];
    };

    const textClick = (event) => {
      const text = userInputs.value[event.id];
      const data = {
        text,
        message: { role: "user", content: text },
      };
      event.onEnd(data);
      delete events.value[event.id];
    };

    const run = async () => {
      const graphai = new GraphAI(graphData, { ...vanilla, eventAgent });
      const result = await graphai.run(true);
      console.log(result);
    };
    run();

    return {
      userInputs,

      events,
      buttonClick,
      textClick,
    };
  }
});
```

```
export const graphData = {
  version: 0.5,
  nodes: {
    one: {
      agent: "textInputAgent",
    },
    two: {
      agent: "textInputAgent",
      inputs: { data: ":one" },
    },
    three: {
      agent: "textInputAgent",
      inputs: { data: ":one" },
    },
    four: {
      agent: "textInputAgent",
      inputs: { data: [":two", ":three"] },
    },
    // event
    oneEvent: {
      agent: "eventAgent",
      params: { type: "button" },
    },
    twoEvent: {
      agent: "eventAgent",
      params: { type: "text" },
    },
  },
};
```