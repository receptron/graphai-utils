import { useState, useRef, useEffect, useCallback } from "react";
import cytoscape from "cytoscape";
import klay from "cytoscape-klay";
import { NodeState, sleep, isObject } from "graphai";
cytoscape.use(klay);
const layout = "klay";
const colorPriority = "#f80";
const colorStatic = "#88f";
const calcNodeWidth = (label) => {
    if (!label)
        return "50px";
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
const cytoscapeFromGraph = (graph_data) => {
    try {
        const elements = Object.keys(graph_data.nodes || {}).reduce((tmp, nodeId) => {
            const node = graph_data.nodes[nodeId];
            const isStatic = "value" in node;
            const cyNode = {
                data: {
                    id: nodeId,
                    color: isStatic ? colorStatic : colorMap[NodeState.Waiting],
                    isStatic,
                },
            };
            tmp.nodes.push(cyNode);
            tmp.map[nodeId] = cyNode;
            if ("inputs" in node) {
                inputs2dataSources(node.inputs).forEach((input) => {
                    if (input[0] === ":") {
                        const { source, label } = parseInput(input);
                        tmp.edges.push({
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
                const { source, label } = parseInput(node.update);
                tmp.edges.push({
                    data: { source, target: nodeId, isUpdate: true, label },
                });
            }
            return tmp;
        }, { nodes: [], edges: [], map: {} });
        return { elements };
    }
    catch (__error) {
        return { elements: { nodes: [], edges: [], map: {} } };
    }
};
export const useCytoscape = (selectedGraph) => {
    const [cyto, setCyto] = useState(0);
    const [cytoscapeData, setCytoscapeData] = useState(() => cytoscapeFromGraph(selectedGraph ?? { nodes: {} }));
    const cytoscapeRef = useRef(null);
    const updateCytoscape = useCallback(async (nodeId, state) => {
        if ([NodeState.Completed, NodeState.Waiting].includes(state)) {
            await sleep(100);
        }
        const elements = cytoscapeData.elements;
        elements.map[nodeId].data.color = colorMap[state];
        const nodeData = selectedGraph.nodes[nodeId];
        if ("agent" in nodeData && state === NodeState.Queued && (nodeData.priority ?? 0) > 0) {
            // computed node
            elements.map[nodeId].data.color = colorPriority;
        }
        else if ("value" in nodeData && state === NodeState.Waiting) {
            // static node
            elements.map[nodeId].data.color = colorStatic;
        }
        setCytoscapeData({ elements });
        if (state === NodeState.Injected) {
            await sleep(100);
            elements.map[nodeId].data.color = colorStatic;
            setCytoscapeData({ elements });
        }
    }, [cytoscapeData, selectedGraph]);
    const createCytoscape = () => {
        try {
            if (!cyto && cytoscapeRef.current) {
                setCyto(cytoscape({
                    container: cytoscapeRef.current,
                    style: cyStyle,
                    layout: { name: layout },
                }));
            }
        }
        catch (error) {
            console.error(error);
        }
    };
    useEffect(() => {
        if (cyto) {
            cyto.on("mouseup", storePositions);
            cyto.on("touchend", storePositions);
        }
    }, [cyto]);
    const updateGraphData = async () => {
        if (cyto) {
            cyto.elements().remove();
            cyto.add(cytoscapeData.elements);
            const name = cytoscapeData.elements.nodes.some((node) => node.position) ? "preset" : layout;
            cyto.layout({ name }).run();
            cyto.fit();
            if (name === layout) {
                await sleep(400);
                storePositions();
            }
        }
    };
    const storePositions = () => {
        if (cyto) {
            cyto.nodes().forEach((cynode) => {
                const id = cynode.id();
                const pos = cynode.position();
                const node = cytoscapeData.elements.map[id];
                node.position = pos;
            });
        }
    };
    const resetCytoscape = () => {
        const elements = cytoscapeData.elements;
        Object.keys(elements.map).forEach((nodeId) => {
            const nodeData = selectedGraph.nodes[nodeId];
            elements.map[nodeId].data.color = "value" in nodeData ? colorStatic : colorMap[NodeState.Waiting];
        });
        setCytoscapeData({ elements });
    };
    useEffect(() => {
        if (cytoscapeRef.current) {
            updateGraphData();
        }
    }, [updateGraphData, cytoscapeRef]);
    useEffect(() => {
        if (cytoscapeRef.current) {
            createCytoscape();
        }
    }, [createCytoscape, cytoscapeRef]);
    useEffect(() => {
        if (selectedGraph) {
            setCytoscapeData(cytoscapeFromGraph(selectedGraph));
        }
    }, [selectedGraph]);
    return {
        cytoscapeRef,
        updateCytoscape,
        resetCytoscape,
    };
};
