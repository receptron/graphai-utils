
## Composable to show GraphAI state to Vue using cytoscape

### install

```sh
yarn add @receptron/graphai_vue_cytoscape
```

### Usage


```typescript
import { defineComponent, ref } from "vue";

import { GraphAI } from "graphai";
import { useCytoscape } from "@receptron/graphai_vue_cytoscape";

export default defineComponent({
  setup() {
    const selectdGraph = ref(graphData)
    const { updateCytoscape, cytoscapeRef, resetCytoscape } = useCytoscape(selectdGraph);
    
    const run = async () => {
      const graphai = new GraphAI(selectdGraph.value, agents);
      graphai.registerCallback(updateCytoscape);
      await graphai.run();
    }
    run();

    return {
      cytoscapeRef
    };
  }
});
```

### requirement

GraphAI 0.6.23 or above