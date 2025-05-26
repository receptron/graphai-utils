<template>
  <main>
    <div class="h-screen w-full">
      <h2>textInputAgent</h2>
      <div class="w-10/12 bg-white">
        <div v-if="inputEvents.length > 0">
          <div v-for="(inputEvent, k) in inputEvents" class="flex" :key="k">
            <input
              v-model="userInputs[inputEvent.nodeId]"
              @keyup.enter="submit(inputEvent.id, userInputs[inputEvent.nodeId])"
              class="border-2 p-2 rounded-md flex-1 m-4"
              :placeholder="inputEvent.nodeId"
            />
            <button
              class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4"
              :class="inputEvent.length == 0 ? 'bg-sky-200' : 'bg-sky-500'"
              @click="submit(inputEvent.id, userInputs[inputEvent.nodeId])"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
      <h2>eventAgent</h2>
      <div class="w-10/12 bg-white">
        <div v-if="Object.values(events).length > 0">
          <div v-for="(event, k) in Object.values(events)" class="flex" :key="k">
            <div v-if="event.type === 'button'">
              <button class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4 bg-sky-500" @click="buttonClick(event)">
                {{ event.params.name }}({{ event.nodeId }})
              </button>
            </div>
            <div v-if="event.type === 'text'">
              <input v-model="userInputs[event.id]" class="border-2 p-2 rounded-md flex-1 m-4" :placeholder="event.nodeId" />
              <button class="text-white font-bold items-center rounded-md px-4 py-2 ml-1 hover:bg-sky-700 flex-none m-4 bg-sky-500" @click="textClick(event)">
                {{ event.params.name }}({{ event.nodeId }})
              </button>
            </div>
          </div>
        </div>
      </div>
      <div>{{ userInputs }}</div>
      <hr />

      <div class="h-screen w-full">
        <div class="w-10/12 h-1/2 bg-white rounded-md mt-4 mx-auto border-2">
          <div ref="cytoscapeRef" class="w-full h-full" />
        </div>
        <div></div>
      </div>
      {{ graphData }}
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

import { GraphAI } from "graphai";
import * as vanilla from "@graphai/vanilla";

import { graphData } from "./data";
import { textInputAgentGenerator, InputEvents } from "./text_input_agent_generator";

import { eventAgentGenerator } from "./event_agent_generator";

import { useCytoscape } from "../../vue-cytoscape/src/composables/cytoscape";

export default defineComponent({
  setup() {
    const userInputs = ref({});
    const inputEvents = ref<InputEvents>([]);
    const { textInputAgent, submit } = textInputAgentGenerator(inputEvents.value);

    //
    const selectdGraph = ref(graphData);
    const { updateCytoscape, cytoscapeRef } = useCytoscape(selectdGraph);

    // eventAgent
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
      const graphai = new GraphAI(graphData, { ...vanilla, textInputAgent, eventAgent });
      graphai.registerCallback(updateCytoscape);
      const result = await graphai.run(true);
      console.log(result);
    };
    run();

    return {
      inputEvents,
      userInputs,
      submit,

      events,
      buttonClick,
      textClick,

      graphData,
      cytoscapeRef,
    };
  },
});
</script>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
