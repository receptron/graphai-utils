import { ref, onMounted, watch } from "vue";
import { NodeState, sleep, isObject } from "graphai";
import cytoscape from "cytoscape";
import klay from "cytoscape-klay";
cytoscape.use(klay);
const layout = "klay";
const colorPriority = "#f80";
const colorStatic = "#88f";
const calcNodeWidth = (label) => {
    if (label === null || label === undefined) {
        return "50px";
    }
    return Math.max(50, label.length * 8) + "px";
};
const cyStyle = [
    {
        selector: "node",
        style: {
            "background-color": "data(color)",
            label: "data(id)",
            shape: (ele) => (ele.data("isStatic") ? "rectangle" : "roundrectangle"),
            width: (ele) => calcNodeWidth(ele.data("id")),
            color: "#fff",
            height: "30px",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
        },
    },
    {
        selector: "edge",
        style: {
            width: 3,
            "line-color": "#888",
            "target-arrow-color": "#888",
            "target-arrow-shape": "triangle",
            "curve-style": "straight",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.8,
            "text-background-shape": "rectangle",
            "font-size": "10px",
        },
    },
    {
        selector: "edge[label]",
        style: {
            label: "data(label)",
        },
    },
    {
        selector: "edge[isUpdate]",
        style: {
            color: "#ddd",
            "line-color": "#ddd",
            "line-style": "dashed",
            "curve-style": "unbundled-bezier",
            "target-arrow-color": "#ddd",
        },
    },
    {
        selector: "edge[isResult]",
        style: {
            color: "#d00",
            "line-color": "#d00",
            "line-style": "dotted",
            "curve-style": "unbundled-bezier",
            "target-arrow-color": "#d00",
        },
    },
];
const colorMap = {
    [NodeState.Waiting]: "#888",
    [NodeState.Completed]: "#000",
    [NodeState.Executing]: "#0f0",
    ["executing-server"]: "#FFC0CB",
    [NodeState.Queued]: "#ff0",
    [NodeState.Injected]: "#00f",
    [NodeState.TimedOut]: "#f0f",
    [NodeState.Failed]: "#f00",
    [NodeState.Skipped]: "#0ff",
};
const parseInput = (input) => {
    // WARNING: Assuming the first character is always ":"
    const ids = input.slice(1).split(".");
    const source = ids.shift() || "";
    const label = ids.length ? ids.join(".") : undefined;
    return { source, label };
};
export const inputs2dataSources = (inputs) => {
    if (Array.isArray(inputs)) {
        return inputs.map((inp) => inputs2dataSources(inp)).flat();
    }
    if (isObject(inputs)) {
        return Object.values(inputs)
            .map((input) => inputs2dataSources(input))
            .flat();
    }
    if (typeof inputs === "string") {
        const templateMatch = Array.from(inputs.matchAll(/\${(:[^}]+)}/g)).map((m) => m[1]);
        if (templateMatch.length > 0) {
            return inputs2dataSources(templateMatch);
        }
    }
    return inputs;
};
export const dataSourceNodeIds = (sources) => {
    return sources.filter((source) => source.nodeId).map((source) => source.nodeId);
};
const node2cyNode = (node, nodeId) => {
    const isStatic = "value" in node;
    const cyNode = {
        data: {
            id: nodeId,
            color: isStatic ? colorStatic : colorMap[NodeState.Waiting],
            isStatic,
        },
    };
    return cyNode;
};
const node2cyEdge = (node, nodeId) => {
    const edges = [];
    if ("inputs" in node) {
        // computed node
        inputs2dataSources(node.inputs).forEach((input) => {
            if (input[0] === ":") {
                const { source, label } = parseInput(input);
                edges.push({
                    data: {
                        source,
                        target: nodeId,
                        label,
                    },
                });
            }
        });
    }
    if ("update" in node && node.update) {
        // static node
        inputs2dataSources([node.update]).forEach((input) => {
            if (input[0] === ":") {
                const { source, label } = parseInput(input);
                edges.push({
                    data: {
                        source,
                        target: nodeId,
                        isUpdate: true,
                        label,
                    },
                });
            }
        });
    }
    return edges;
};
const cytoscapeFromGraph = (_graph_data) => {
    const elements = { nodes: [], edges: [], map: {} };
    const pushEdge = (data) => {
        elements.edges.push({ data });
    };
    const toGraph = (graph_data) => {
        Object.keys(graph_data.nodes || {}).forEach((nodeId) => {
            const node = graph_data.nodes[nodeId];
            const cyNode = node2cyNode(node, nodeId);
            elements.nodes.push(cyNode);
            elements.map[nodeId] = cyNode;
            node2cyEdge(node, nodeId).forEach((edge) => {
                elements.edges.push(edge);
            });
            // nested
            if ("agent" in node && node.agent === "nestedAgent") {
                const graph = typeof node.graph === "string" ? JSON.parse(node.graph) : { ...node.graph };
                const staticInputs = Object.keys(graph.nodes)
                    .filter((key) => "value" in graph.nodes[key])
                    .reduce((tmp, key) => {
                    if (graph.nodes[key].value[0] === ":") {
                        const { source } = parseInput(graph.nodes[key].value);
                        if (!tmp[source]) {
                            tmp[source] = [];
                        }
                        tmp[source].push(key);
                    }
                    return tmp;
                }, {});
                Object.keys(node.inputs).forEach((parentInputNodeId) => {
                    if (!graph.nodes[parentInputNodeId]) {
                        graph.nodes[parentInputNodeId] = { value: "dummy" };
                    }
                    inputs2dataSources([node.inputs[parentInputNodeId]]).forEach((input) => {
                        const { source } = parseInput(input);
                        pushEdge({ source: nodeId, target: parentInputNodeId, label: source });
                        if (staticInputs[parentInputNodeId]) {
                            staticInputs[parentInputNodeId].forEach((id) => {
                                pushEdge({ source: nodeId, target: id, label: parentInputNodeId });
                            });
                        }
                    });
                });
                toGraph(graph);
                Object.keys(graph.nodes).forEach((key) => {
                    const childNode = graph.nodes[key];
                    if ("agent" in childNode && childNode.isResult) {
                        pushEdge({ source: key, target: nodeId, label: "result", isResult: true });
                    }
                });
            }
        });
    };
    toGraph(_graph_data);
    return { elements };
};
export const useCytoscape = (selectedGraph) => {
    let cy = null;
    const cytoscapeData = ref(cytoscapeFromGraph(selectedGraph.value ?? { nodes: {} }));
    const cytoscapeRef = ref();
    const zoomingEnabled = ref(true);
    const updateCytoscape = async (log) => {
        const { nodeId, state } = log;
        if ([NodeState.Completed, NodeState.Waiting].includes(state)) {
            await sleep(100);
        }
        const elements = cytoscapeData.value.elements;
        if (elements.map[nodeId]) {
            elements.map[nodeId].data.color = colorMap[state];
            const graph = selectedGraph.value;
            const nodeData = (graph?.nodes ?? {})[nodeId] ?? {};
            if ("agent" in nodeData && state === NodeState.Queued && (nodeData.priority ?? 0) > 0) {
                // computed node
                elements.map[nodeId].data.color = colorPriority;
            }
            else if ("value" in nodeData && state === NodeState.Waiting) {
                // static node
                elements.map[nodeId].data.color = colorStatic;
            }
            cytoscapeData.value = { elements };
            if (state === NodeState.Injected) {
                await sleep(100);
                elements.map[nodeId].data.color = colorStatic;
                cytoscapeData.value = { elements };
            }
        }
    };
    const createCytoscape = () => {
        try {
            cy = cytoscape({
                container: cytoscapeRef.value,
                style: cyStyle,
                layout: {
                    name: layout,
                    // fit: true,
                    // padding: 30,
                    // avoidOverlap: true,
                },
            });
            cy.on("mouseup", storePositions);
            cy.on("touchend", storePositions);
            // cy.on("select", "node", callback);
            // cy.on("select", "edge", callback);
            //store.commit("setCytoscape", cy);
        }
        catch (error) {
            console.error(error);
            // store.commit("setCytoscape", null);
            // error_msg.value = `${error}`;
        }
    };
    const updateGraphData = async () => {
        if (cy) {
            cy.elements().remove();
            cy.add(cytoscapeData.value.elements);
            const name = cytoscapeData.value.elements.nodes.reduce((prevName, node) => {
                if (node.position) {
                    return "preset";
                }
                return prevName;
            }, layout);
            // console.log("layout", name);
            cy.layout({ name }).run();
            cy.fit();
            if (name === layout) {
                await sleep(400);
                storePositions();
            }
        }
    };
    const storePositions = () => {
        // console.log("storePositions");
        if (cy) {
            cy.nodes().forEach((cynode) => {
                const id = cynode.id();
                const pos = cynode.position();
                const node = cytoscapeData.value.elements.map[id];
                node.position = pos;
            });
        }
    };
    const resetCytoscape = () => {
        const elements = cytoscapeData.value.elements;
        Object.keys(elements.map).forEach((nodeId) => {
            const graph = selectedGraph.value;
            const nodeData = graph.nodes[nodeId];
            elements.map[nodeId].data.color = "value" in nodeData ? colorStatic : colorMap[NodeState.Waiting];
        });
        cytoscapeData.value = { elements };
    };
    watch(cytoscapeData, () => {
        console.log("updated");
        updateGraphData();
    });
    watch(selectedGraph, () => {
        cytoscapeData.value = cytoscapeFromGraph(selectedGraph.value);
    });
    onMounted(() => {
        createCytoscape();
        updateGraphData();
    });
    const layoutCytoscape = (key) => {
        if (cy) {
            const positions = cy.nodes().map((node) => {
                return {
                    id: node.id(),
                    position: node.position(),
                };
            });
            console.log(JSON.stringify(positions));
            localStorage.setItem("layoutData-" + key, JSON.stringify(positions));
        }
    };
    const loadLayout = (key) => {
        const savedLayoutData = localStorage.getItem("layoutData-" + key);
        if (savedLayoutData) {
            const positions = JSON.parse(savedLayoutData);
            positions.forEach((data) => {
                if (cy) {
                    const node = cy.getElementById(data.id);
                    if (node) {
                        node.position(data.position);
                    }
                }
            });
        }
    };
    watch(zoomingEnabled, (value) => {
        if (cy) {
            cy.zoomingEnabled(value);
        }
    });
    return {
        cytoscapeRef,
        updateCytoscape,
        resetCytoscape,
        layoutCytoscape,
        loadLayout,
        zoomingEnabled,
    };
};
