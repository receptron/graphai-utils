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
      params: { type: "button", name: "button event" },
    },
    twoEvent: {
      agent: "eventAgent",
      params: { type: "text", name: "text event" },
      inputs: { data: [":oneEvent"] },
    },
    threeEvent: {
      agent: "eventAgent",
      params: { type: "button", name: "button event" },
      inputs: { data: [":oneEvent"] },
    },
    fourEvent: {
      agent: "eventAgent",
      params: { type: "button", name: "button event" },
      inputs: { data: [":threeEvent"] },
    },
  },
};
