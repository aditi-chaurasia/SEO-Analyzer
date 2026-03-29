import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

// Helper: Detect image type
function detectImageType(imageName) {
  const name = imageName.toLowerCase();
  if (name.includes("logo") || name.includes("icon")) return "logo";
  if (name.includes("chart") || name.includes("graph") || name.includes("diagram")) return "chart";
  if (name.includes("button") || name.includes("badge")) return "button";
  if (name.includes("banner") || name.includes("hero")) return "banner";
  return "generic";
}

// Function to create nodes with a specific API key
function createALTNodes(apiKey) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    apiKey,
  });

  // Node 1: Extract and classify image
  async function extractImageInfoNode(state) {
    const imageType = detectImageType(state.imageName);
    return { ...state, imageType, analyzed: true };
  }

  // Node 2a: Generate ALT for logos (concise, brand-focused)
  async function generateLogoALTNode(state) {
    try {
      const prompt = `Generate brand/logo ALT text:
Logo: ${state.imageName}
Page: ${state.pageContext}
Max 50 chars, company name, no "logo of".
Return ONLY the ALT text.`;

      const message = await model.invoke([new HumanMessage(prompt)]);
      return { ...state, suggestedAlt: message.content.trim(), error: null, regenerations: 0 };
    } catch (error) {
      return { ...state, suggestedAlt: "Logo", error: error.message, regenerations: 0 };
    }
  }

  // Node 2b: Generate ALT for charts (descriptive, data-focused)
  async function generateChartALTNode(state) {
    try {
      const prompt = `Generate chart/diagram ALT text:
Chart: ${state.imageName}
Page: ${state.pageContext}
Max 125 chars, describe data/purpose, no "chart of".
Return ONLY the ALT text.`;

      const message = await model.invoke([new HumanMessage(prompt)]);
      return { ...state, suggestedAlt: message.content.trim(), error: null, regenerations: 0 };
    } catch (error) {
      return { ...state, suggestedAlt: "Chart", error: error.message, regenerations: 0 };
    }
  }

  // Node 2c: Generate ALT for generic images
  async function generateGenericALTNode(state) {
    try {
      const prompt = `You are an SEO expert. Generate concise ALT text for:
Image: ${state.imageName}
Page: ${state.pageContext}
Max 125 chars, no "image of", descriptive, keywords.
Return ONLY the ALT text.`;

      const message = await model.invoke([new HumanMessage(prompt)]);
      return { ...state, suggestedAlt: message.content.trim(), error: null, regenerations: 0 };
    } catch (error) {
      return { ...state, suggestedAlt: "Image", error: error.message, regenerations: 0 };
    }
  }

  // Node 3: Quality check with conditional regeneration
  async function validateALTNode(state) {
    let finalAlt = state.suggestedAlt;
    
    if (finalAlt.length > 125) {
      finalAlt = finalAlt.substring(0, 122) + "...";
    }
    
    const isTooShort = finalAlt.length < 10;
    
    return { 
      ...state, 
      suggestedAlt: finalAlt,
      needsRegeneration: isTooShort,
      regenerations: state.regenerations || 0
    };
  }

  // Node 4: Regenerate if quality is poor
  async function regenerateALTNode(state) {
    try {
      const prompt = `Generate detailed ALT text for ${state.imageType}:
${state.imageName}
Context: ${state.pageContext}
This is attempt ${(state.regenerations || 0) + 1}. Be more descriptive.
Max 125 chars, return ONLY the ALT text.`;

      const message = await model.invoke([new HumanMessage(prompt)]);
      return { 
        ...state, 
        suggestedAlt: message.content.trim(),
        regenerations: (state.regenerations || 0) + 1,
        needsRegeneration: false
      };
    } catch (error) {
      return { ...state, needsRegeneration: false };
    }
  }

  return {
    extractImageInfoNode,
    generateLogoALTNode,
    generateChartALTNode,
    generateGenericALTNode,
    validateALTNode,
    regenerateALTNode,
  };
}

// Function to build and compile the graph
function buildGraph(nodes) {
  try {
    const graph = new StateGraph({
      channels: {
        imageUrl: { value: "" },
        imageName: { value: "" },
        pageContext: { value: "" },
        imageType: { value: "generic" },
        suggestedAlt: { value: "" },
        analyzed: { value: false },
        error: { value: null },
        needsRegeneration: { value: false },
        regenerations: { value: 0 },
      },
    });

    graph.addNode("extract", nodes.extractImageInfoNode);
    graph.addNode("generate_logo", nodes.generateLogoALTNode);
    graph.addNode("generate_chart", nodes.generateChartALTNode);
    graph.addNode("generate_generic", nodes.generateGenericALTNode);
    graph.addNode("validate", nodes.validateALTNode);
    graph.addNode("regenerate", nodes.regenerateALTNode);

    graph.addEdge(START, "extract");

    graph.addConditionalEdges(
      "extract",
      (state) => {
        const imageType = state.imageType;
        if (imageType === "logo") return "generate_logo";
        if (imageType === "chart") return "generate_chart";
        return "generate_generic";
      }
    );

    graph.addEdge("generate_logo", "validate");
    graph.addEdge("generate_chart", "validate");
    graph.addEdge("generate_generic", "validate");

    graph.addConditionalEdges(
      "validate",
      (state) => {
        return state.needsRegeneration && (state.regenerations || 0) < 1 ? "regenerate" : "end";
      }
    );

    graph.addEdge("regenerate", "validate");
    graph.addEdge("validate", END);

    return graph.compile();
  } catch (e) {
    return null;
  }
}

// Main export function
export async function generateALTTextWithLangGraph(imageData) {
  const geminiKey = imageData.geminiKey;
  
  // Create nodes with the provided API key
  const nodes = createALTNodes(geminiKey);
  const compiledGraph = buildGraph(nodes);

  if (compiledGraph) {
    try {
      const result = await compiledGraph.invoke({
        imageUrl: imageData.imageUrl,
        imageName: imageData.imageName,
        pageContext: imageData.pageContext,
        imageType: "generic",
        suggestedAlt: "",
        analyzed: false,
        error: null,
        needsRegeneration: false,
        regenerations: 0,
      });
      return result.suggestedAlt;
    } catch (error) {
    }
  }

  // Fallback: Run nodes sequentially
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    apiKey: geminiKey,
  });

  const imageType = detectImageType(imageData.imageName);
  let state = {
    imageUrl: imageData.imageUrl,
    imageName: imageData.imageName,
    pageContext: imageData.pageContext,
    imageType,
    suggestedAlt: "",
    analyzed: false,
    error: null,
    needsRegeneration: false,
    regenerations: 0,
  };

  // Extract
  state.imageType = detectImageType(state.imageName);
  state.analyzed = true;

  // Generate based on type
  try {
    let prompt = "";
    if (imageType === "logo") {
      prompt = `Generate brand/logo ALT text:
Logo: ${state.imageName}
Page: ${state.pageContext}
Max 50 chars, company name, no "logo of".
Return ONLY the ALT text.`;
    } else if (imageType === "chart") {
      prompt = `Generate chart/diagram ALT text:
Chart: ${state.imageName}
Page: ${state.pageContext}
Max 125 chars, describe data/purpose, no "chart of".
Return ONLY the ALT text.`;
    } else {
      prompt = `You are an SEO expert. Generate concise ALT text for:
Image: ${state.imageName}
Page: ${state.pageContext}
Max 125 chars, no "image of", descriptive, keywords.
Return ONLY the ALT text.`;
    }

    const message = await model.invoke([new HumanMessage(prompt)]);
    state.suggestedAlt = message.content.trim();
  } catch (error) {
    state.suggestedAlt = imageType === "logo" ? "Logo" : imageType === "chart" ? "Chart" : "Image";
  }

  // Validate
  if (state.suggestedAlt.length > 125) {
    state.suggestedAlt = state.suggestedAlt.substring(0, 122) + "...";
  }

  return state.suggestedAlt;
}

export default generateALTTextWithLangGraph;
