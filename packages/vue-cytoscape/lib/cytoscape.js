"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCytoscape = exports.dataSourceNodeIds = exports.inputs2dataSources = void 0;
var vue_1 = require("vue");
var graphai_1 = require("graphai");
var cytoscape_1 = __importDefault(require("cytoscape"));
var cytoscape_klay_1 = __importDefault(require("cytoscape-klay"));
cytoscape_1.default.use(cytoscape_klay_1.default);
var layout = "klay";
var colorPriority = "#f80";
var colorStatic = "#88f";
var calcNodeWidth = function (label) {
    if (label === null || label === undefined) {
        return "50px";
    }
    return Math.max(50, label.length * 8) + "px";
};
var cyStyle = [
    {
        selector: "node",
        style: {
            "background-color": "data(color)",
            label: "data(id)",
            shape: function (ele) { return (ele.data("isStatic") ? "rectangle" : "roundrectangle"); },
            width: function (ele) { return calcNodeWidth(ele.data("id")); },
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
var colorMap = (_a = {},
    _a[graphai_1.NodeState.Waiting] = "#888",
    _a[graphai_1.NodeState.Completed] = "#000",
    _a[graphai_1.NodeState.Executing] = "#0f0",
    _a["executing-server"] = "#FFC0CB",
    _a[graphai_1.NodeState.Queued] = "#ff0",
    _a[graphai_1.NodeState.Injected] = "#00f",
    _a[graphai_1.NodeState.TimedOut] = "#f0f",
    _a[graphai_1.NodeState.Failed] = "#f00",
    _a[graphai_1.NodeState.Skipped] = "#0ff",
    _a);
var parseInput = function (input) {
    // WARNING: Assuming the first character is always ":"
    var ids = input.slice(1).split(".");
    var source = ids.shift() || "";
    var label = ids.length ? ids.join(".") : undefined;
    return { source: source, label: label };
};
var inputs2dataSources = function (inputs) {
    if (Array.isArray(inputs)) {
        return inputs.map(function (inp) { return (0, exports.inputs2dataSources)(inp); }).flat();
    }
    if ((0, graphai_1.isObject)(inputs)) {
        return Object.values(inputs)
            .map(function (input) { return (0, exports.inputs2dataSources)(input); })
            .flat();
    }
    if (typeof inputs === "string") {
        var templateMatch = Array.from(inputs.matchAll(/\${(:[^}]+)}/g)).map(function (m) { return m[1]; });
        if (templateMatch.length > 0) {
            return (0, exports.inputs2dataSources)(templateMatch);
        }
    }
    return inputs;
};
exports.inputs2dataSources = inputs2dataSources;
var dataSourceNodeIds = function (sources) {
    return sources.filter(function (source) { return source.nodeId; }).map(function (source) { return source.nodeId; });
};
exports.dataSourceNodeIds = dataSourceNodeIds;
var node2cyNode = function (node, nodeId) {
    var isStatic = "value" in node;
    var cyNode = {
        data: {
            id: nodeId,
            color: isStatic ? colorStatic : colorMap[graphai_1.NodeState.Waiting],
            isStatic: isStatic,
        },
    };
    return cyNode;
};
var node2cyEdge = function (node, nodeId) {
    var edges = [];
    if ("inputs" in node) {
        // computed node
        (0, exports.inputs2dataSources)(node.inputs).forEach(function (input) {
            if (input[0] === ":") {
                var _a = parseInput(input), source = _a.source, label = _a.label;
                edges.push({
                    data: {
                        source: source,
                        target: nodeId,
                        label: label,
                    },
                });
            }
        });
    }
    if ("update" in node && node.update) {
        // static node
        (0, exports.inputs2dataSources)([node.update]).forEach(function (input) {
            if (input[0] === ":") {
                var _a = parseInput(input), source = _a.source, label = _a.label;
                edges.push({
                    data: {
                        source: source,
                        target: nodeId,
                        isUpdate: true,
                        label: label,
                    },
                });
            }
        });
    }
    return edges;
};
var cytoscapeFromGraph = function (_graph_data) {
    var elements = { nodes: [], edges: [], map: {} };
    var pushEdge = function (data) {
        elements.edges.push({ data: data });
    };
    var toGraph = function (graph_data) {
        Object.keys(graph_data.nodes || {}).forEach(function (nodeId) {
            var node = graph_data.nodes[nodeId];
            var cyNode = node2cyNode(node, nodeId);
            elements.nodes.push(cyNode);
            elements.map[nodeId] = cyNode;
            node2cyEdge(node, nodeId).forEach(function (edge) {
                elements.edges.push(edge);
            });
            // nested
            if ("agent" in node && node.agent === "nestedAgent") {
                var graph_1 = typeof node.graph === "string" ? JSON.parse(node.graph) : __assign({}, node.graph);
                var staticInputs_1 = Object.keys(graph_1.nodes)
                    .filter(function (key) { return "value" in graph_1.nodes[key]; })
                    .reduce(function (tmp, key) {
                    if (graph_1.nodes[key].value[0] === ":") {
                        var source = parseInput(graph_1.nodes[key].value).source;
                        if (!tmp[source]) {
                            tmp[source] = [];
                        }
                        tmp[source].push(key);
                    }
                    return tmp;
                }, {});
                Object.keys(node.inputs).forEach(function (parentInputNodeId) {
                    if (!graph_1.nodes[parentInputNodeId]) {
                        graph_1.nodes[parentInputNodeId] = { value: "dummy" };
                    }
                    (0, exports.inputs2dataSources)([node.inputs[parentInputNodeId]]).forEach(function (input) {
                        var source = parseInput(input).source;
                        pushEdge({ source: nodeId, target: parentInputNodeId, label: source });
                        if (staticInputs_1[parentInputNodeId]) {
                            staticInputs_1[parentInputNodeId].forEach(function (id) {
                                pushEdge({ source: nodeId, target: id, label: parentInputNodeId });
                            });
                        }
                    });
                });
                toGraph(graph_1);
                Object.keys(graph_1.nodes).forEach(function (key) {
                    var childNode = graph_1.nodes[key];
                    if ("agent" in childNode && childNode.isResult) {
                        pushEdge({ source: key, target: nodeId, label: "result", isResult: true });
                    }
                });
            }
        });
    };
    toGraph(_graph_data);
    return { elements: elements };
};
var useCytoscape = function (selectedGraph) {
    var _a;
    var cy = null;
    var cytoscapeData = (0, vue_1.ref)(cytoscapeFromGraph((_a = selectedGraph.value) !== null && _a !== void 0 ? _a : { nodes: {} }));
    var cytoscapeRef = (0, vue_1.ref)();
    var zoomingEnabled = (0, vue_1.ref)(true);
    var updateCytoscape = function (log) { return __awaiter(void 0, void 0, void 0, function () {
        var nodeId, state, elements, graph, nodeData;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    nodeId = log.nodeId, state = log.state;
                    if (![graphai_1.NodeState.Completed, graphai_1.NodeState.Waiting].includes(state)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, graphai_1.sleep)(100)];
                case 1:
                    _d.sent();
                    _d.label = 2;
                case 2:
                    elements = cytoscapeData.value.elements;
                    if (!elements.map[nodeId]) return [3 /*break*/, 4];
                    elements.map[nodeId].data.color = colorMap[state];
                    graph = selectedGraph.value;
                    nodeData = (_b = ((_a = graph === null || graph === void 0 ? void 0 : graph.nodes) !== null && _a !== void 0 ? _a : {})[nodeId]) !== null && _b !== void 0 ? _b : {};
                    if ("agent" in nodeData && state === graphai_1.NodeState.Queued && ((_c = nodeData.priority) !== null && _c !== void 0 ? _c : 0) > 0) {
                        // computed node
                        elements.map[nodeId].data.color = colorPriority;
                    }
                    else if ("value" in nodeData && state === graphai_1.NodeState.Waiting) {
                        // static node
                        elements.map[nodeId].data.color = colorStatic;
                    }
                    cytoscapeData.value = { elements: elements };
                    if (!(state === graphai_1.NodeState.Injected)) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, graphai_1.sleep)(100)];
                case 3:
                    _d.sent();
                    elements.map[nodeId].data.color = colorStatic;
                    cytoscapeData.value = { elements: elements };
                    _d.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var createCytoscape = function () {
        try {
            cy = (0, cytoscape_1.default)({
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
    var updateGraphData = function () { return __awaiter(void 0, void 0, void 0, function () {
        var name_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!cy) return [3 /*break*/, 2];
                    cy.elements().remove();
                    cy.add(cytoscapeData.value.elements);
                    name_1 = cytoscapeData.value.elements.nodes.reduce(function (prevName, node) {
                        if (node.position) {
                            return "preset";
                        }
                        return prevName;
                    }, layout);
                    // console.log("layout", name);
                    cy.layout({ name: name_1 }).run();
                    cy.fit();
                    if (!(name_1 === layout)) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, graphai_1.sleep)(400)];
                case 1:
                    _a.sent();
                    storePositions();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
    var storePositions = function () {
        // console.log("storePositions");
        if (cy) {
            cy.nodes().forEach(function (cynode) {
                var id = cynode.id();
                var pos = cynode.position();
                var node = cytoscapeData.value.elements.map[id];
                node.position = pos;
            });
        }
    };
    var resetCytoscape = function () {
        var elements = cytoscapeData.value.elements;
        Object.keys(elements.map).forEach(function (nodeId) {
            var graph = selectedGraph.value;
            var nodeData = graph.nodes[nodeId];
            elements.map[nodeId].data.color = "value" in nodeData ? colorStatic : colorMap[graphai_1.NodeState.Waiting];
        });
        cytoscapeData.value = { elements: elements };
    };
    (0, vue_1.watch)(cytoscapeData, function () {
        console.log("updated");
        updateGraphData();
    });
    (0, vue_1.watch)(selectedGraph, function () {
        cytoscapeData.value = cytoscapeFromGraph(selectedGraph.value);
    });
    (0, vue_1.onMounted)(function () {
        createCytoscape();
        updateGraphData();
    });
    var layoutCytoscape = function (key) {
        if (cy) {
            var positions = cy.nodes().map(function (node) {
                return {
                    id: node.id(),
                    position: node.position(),
                };
            });
            console.log(JSON.stringify(positions));
            localStorage.setItem("layoutData-" + key, JSON.stringify(positions));
        }
    };
    var loadLayout = function (key) {
        var savedLayoutData = localStorage.getItem("layoutData-" + key);
        if (savedLayoutData) {
            var positions = JSON.parse(savedLayoutData);
            positions.forEach(function (data) {
                if (cy) {
                    var node = cy.getElementById(data.id);
                    if (node) {
                        node.position(data.position);
                    }
                }
            });
        }
    };
    (0, vue_1.watch)(zoomingEnabled, function (value) {
        if (cy) {
            cy.zoomingEnabled(value);
        }
    });
    return {
        cytoscapeRef: cytoscapeRef,
        updateCytoscape: updateCytoscape,
        resetCytoscape: resetCytoscape,
        layoutCytoscape: layoutCytoscape,
        loadLayout: loadLayout,
        zoomingEnabled: zoomingEnabled,
    };
};
exports.useCytoscape = useCytoscape;
